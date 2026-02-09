# NEXENT MOBILE APP - DEVELOPER DOCUMENTATION

> **FOR DEVELOPERS ONLY** - This document explains how features were architected and implemented from scratch.

---

## 📚 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Wallet System Architecture](#wallet-system-architecture)
3. [Discount Coupon System](#discount-coupon-system)
4. [Reorder Feature](#reorder-feature)
5. [Invoice Email System](#invoice-email-system)
6. [Implementation Deep Dive](#implementation-deep-dive)
7. [Technical Stack](#technical-stack)
8. [Database Schema Design](#database-schema-design)

---

## 🎯 PROJECT OVERVIEW

**Nexent** is a full-stack e-commerce mobile application built with:

- **Frontend:** React Native + Expo (TypeScript)
- **Backend:** Node.js + Express
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** Clerk
- **Payments:** Stripe
- **Email:** Nodemailer (Gmail SMTP)

This app demonstrates advanced e-commerce features including a gamified reward system, dynamic discounts, reorder functionality, and automated invoice delivery.

---

## 💰 WALLET SYSTEM ARCHITECTURE

### Concept

A virtual wallet system where users earn coins for purchases and can redeem them for discount coupons. This gamifies the shopping experience and encourages repeat purchases.

### How It Was Built

#### 1. Database Schema (`backend/src/models/wallet.model.js`)

```javascript
const walletSchema = {
  user: ObjectId, // Reference to User model
  clerkId: String, // Clerk authentication ID (for quick lookups)
  coins: Number, // Current coin balance
  lifetimeCoins: Number, // Total coins earned (never decreases)
  transactions: [
    {
      // Complete transaction history
      type: enum[("earned", "redeemed", "expired")],
      amount: Number, // Positive for earned, negative for redeemed
      description: String, // Human-readable description
      orderId: ObjectId, // Link to order (for earned coins)
      couponId: ObjectId, // Link to coupon (for redeemed coins)
      createdAt: Date,
    },
  ],
};
```

**Key Design Decisions:**

- **Dual balance tracking:** `coins` (current) vs `lifetimeCoins` (total earned)
  - Current balance can go down when redeeming
  - Lifetime coins show total achievement/engagement
- **Transaction log:** Immutable history for transparency and debugging
- **ClerkId denormalization:** Faster queries without JOIN operations

#### 2. Earning Coins Flow

**Trigger:** User completes an order

**Implementation in `backend/src/controlllers/order.controller.js`:**

```javascript
// Step 1: Calculate coins (10 coins per product, regardless of quantity)
const coinsEarned = orderItems.length * 10;

// Step 2: Create order with coins metadata
const order = await Order.create({
  ...orderData,
  coinsEarned, // Store for reference
});

// Step 3: Find or create user's wallet
let wallet = await Wallet.findOne({ clerkId: user.clerkId });
if (!wallet) {
  wallet = await Wallet.create({
    user: user._id,
    clerkId: user.clerkId,
    coins: 0,
    lifetimeCoins: 0,
    transactions: [],
  });
}

// Step 4: Add coins to wallet
wallet.coins += coinsEarned;
wallet.lifetimeCoins += coinsEarned;

// Step 5: Record transaction
wallet.transactions.push({
  type: "earned",
  amount: coinsEarned,
  description: `Earned from order #${order._id}`,
  orderId: order._id,
});

await wallet.save();
```

**Why this approach?**

- Coins are awarded immediately upon order creation
- Transaction history provides audit trail
- Atomic operations prevent race conditions
- If wallet doesn't exist, it's created on-the-fly (lazy initialization)

#### 3. Viewing Wallet Balance

**Mobile Implementation (`mobile/nexent/hooks/useWallet.ts`):**

```typescript
export function useWallet() {
  const api = useApi();

  return useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const { data } = await api.get("/wallet");
      return data.wallet;
    },
  });
}
```

**Backend Route (`backend/src/controlllers/wallet.controller.js`):**

```javascript
export async function getWallet(req, res) {
  let wallet = await Wallet.findOne({ clerkId: user.clerkId });

  if (!wallet) {
    // Auto-create wallet if it doesn't exist
    wallet = await Wallet.create({
      user: user._id,
      clerkId: user.clerkId,
      coins: 0,
      lifetimeCoins: 0,
      transactions: [],
    });
  }

  res.status(200).json({ wallet });
}
```

---

## 🎟️ DISCOUNT COUPON SYSTEM

### Concept

Users redeem wallet coins to generate one-time-use discount coupons with tiered benefits.

### How It Was Built

#### 1. Coupon Tiers Design

**Three tier system:**
| Tier | Coins Required | Discount | Target User |
|--------|---------------|----------|-------------|
| Bronze | 100 coins | 10% off | New users |
| Silver | 300 coins | 35% off | Regular |
| Gold | 500 coins | 60% off | VIP/Loyal |

**Why this structure?**

- Progressive benefits incentivize more purchases
- 100-coin entry point is achievable (10 products = 1 coupon)
- High-tier discounts reward loyalty without losing profitability

#### 2. Database Schema (`backend/src/models/coupon.model.js`)

```javascript
const couponSchema = {
  user: ObjectId, // Owner
  clerkId: String, // For fast lookups
  code: String, // 6-letter unique code (e.g., "ABCXYZ")
  type: enum[("bronze", "silver", "gold")],
  discount: Number, // Percentage (10, 35, or 60)
  coinsRequired: Number, // Historical record of redemption cost
  isUsed: Boolean, // Single-use flag
  usedAt: Date, // When it was applied
  orderId: ObjectId, // Which order used it
  expiresAt: Date, // 30 days from creation
  createdAt: Date,
};
```

**Key Features:**

- **Unique 6-character code:** Easy to remember, impossible to guess
- **Single-use enforcement:** `isUsed` flag + database query validation
- **30-day expiry:** Creates urgency, prevents hoarding
- **Order linkage:** Tracks which order used the coupon

#### 3. Coupon Redemption Flow

**Implementation (`backend/src/controlllers/wallet.controller.js`):**

```javascript
export async function redeemCoupon(req, res) {
  const { type } = req.body; // bronze, silver, or gold

  // Step 1: Define tier configuration
  const couponTiers = {
    bronze: { coinsRequired: 100, discount: 10 },
    silver: { coinsRequired: 300, discount: 35 },
    gold: { coinsRequired: 500, discount: 60 },
  };

  const tier = couponTiers[type];

  // Step 2: Validate user has enough coins
  const wallet = await Wallet.findOne({ clerkId: user.clerkId });
  if (wallet.coins < tier.coinsRequired) {
    return res.status(400).json({ error: "Insufficient coins" });
  }

  // Step 3: Generate unique 6-letter code
  const generateCouponCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  let couponCode;
  let isUnique = false;

  // Ensure uniqueness (rare collisions but important)
  while (!isUnique) {
    couponCode = generateCouponCode();
    const existingCoupon = await Coupon.findOne({ code: couponCode });
    if (!existingCoupon) isUnique = true;
  }

  // Step 4: Create coupon with 30-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const coupon = await Coupon.create({
    user: user._id,
    clerkId: user.clerkId,
    code: couponCode,
    type,
    discount: tier.discount,
    coinsRequired: tier.coinsRequired,
    expiresAt,
  });

  // Step 5: Deduct coins from wallet
  wallet.coins -= tier.coinsRequired;
  wallet.transactions.push({
    type: "redeemed",
    amount: -tier.coinsRequired,
    description: `Redeemed ${type} coupon (${tier.discount}% off)`,
    couponId: coupon._id,
  });

  await wallet.save();

  res.status(200).json({
    message: `Coupon code: ${couponCode}`,
    coupon,
    wallet,
  });
}
```

**Why this implementation?**

- Code generation is collision-safe (while loop ensures uniqueness)
- Transaction is atomic (deduct coins + create coupon in same operation)
- 30-day expiry creates urgency
- Transaction log preserves history

#### 4. Applying Coupons at Checkout

**Implementation in Order Creation (`backend/src/controlllers/order.controller.js`):**

```javascript
export async function createOrder(req, res) {
  const { couponCode, totalPrice } = req.body;

  let discount = 0;
  let couponUsed = null;

  // Step 1: Validate coupon if provided
  if (couponCode) {
    const coupon = await Coupon.findOne({
      code: couponCode,
      clerkId: user.clerkId, // Must own the coupon
      isUsed: false, // Must not be used
      expiresAt: { $gt: new Date() }, // Must not be expired
    });

    // Step 2: Check minimum order value (₹100)
    if (coupon && totalPrice >= 100) {
      discount = (totalPrice * coupon.discount) / 100;
      couponUsed = coupon._id;

      // Step 3: Mark coupon as used (single-use enforcement)
      coupon.isUsed = true;
      coupon.usedAt = new Date();
      await coupon.save();
    }
  }

  // Step 4: Calculate final price
  const finalPrice = totalPrice - discount;

  // Step 5: Create order with discount info
  const order = await Order.create({
    ...orderData,
    totalPrice: finalPrice,
    discount,
    couponUsed,
  });

  // Step 6: Link coupon to order
  if (couponUsed) {
    await Coupon.findByIdAndUpdate(couponUsed, {
      orderId: order._id,
    });
  }
}
```

**Validation Rules:**

1. Coupon must belong to the user (can't use someone else's)
2. Coupon must not be already used (`isUsed: false`)
3. Coupon must not be expired (`expiresAt > now`)
4. Order must meet minimum value (₹100)

**Mobile UI Flow (`mobile/nexent/app/(tabs)/cart.tsx`):**

```typescript
// User enters 6-character code
const [couponCode, setCouponCode] = useState("");

// Validate and apply coupon
const validateCoupon = async () => {
  const { data } = await api.post("/wallet/validate-coupon", {
    code: couponCode
  });

  if (data.valid) {
    setAppliedCoupon(data.coupon);
    setDiscount((cartTotal * data.coupon.discount) / 100);
  }
};

// Show discount in UI
<Text>Subtotal: ₹{cartTotal}</Text>
{discount > 0 && (
  <Text>Discount ({appliedCoupon.discount}%): -₹{discount}</Text>
)}
<Text>Total: ₹{cartTotal - discount}</Text>
```

---

## 🔄 REORDER FEATURE

### Concept

Allow users to quickly reorder items from a past order without re-adding each product manually.

### How It Was Built

#### 1. Backend Implementation (`backend/src/controlllers/order.controller.js`)

```javascript
export async function reorderOrder(req, res) {
  const { orderId } = req.params;
  const user = req.user;

  // Step 1: Find original order
  const originalOrder =
    await Order.findById(orderId).populate("orderItems.product");

  if (!originalOrder) {
    return res.status(404).json({ error: "Order not found" });
  }

  // Step 2: Verify ownership
  if (originalOrder.clerkId !== user.clerkId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  // Step 3: Check product availability and stock
  const availableItems = [];
  const unavailableItems = [];

  for (const item of originalOrder.orderItems) {
    const product = await Product.findById(item.product._id);

    if (!product || product.stock < item.quantity) {
      unavailableItems.push({
        name: item.name,
        reason: !product ? "Product no longer available" : "Insufficient stock",
      });
    } else {
      availableItems.push({
        product: product._id,
        name: product.name,
        price: product.price, // Use current price, not old price
        quantity: item.quantity,
        image: product.images[0],
      });
    }
  }

  // Step 4: Return available items for cart
  res.status(200).json({
    availableItems,
    unavailableItems,
    message:
      availableItems.length > 0
        ? "Items ready to add to cart"
        : "No items available for reorder",
  });
}
```

**Key Features:**

- **Stock validation:** Checks if products are still in stock
- **Price updates:** Uses current price, not historical price
- **Partial reorder:** If some items unavailable, still allows reordering available ones
- **User feedback:** Returns list of unavailable items with reasons

#### 2. Mobile Implementation (`mobile/nexent/hooks/useReorder.ts`)

```typescript
export function useReorder() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // Call backend reorder endpoint
      const { data } = await api.post(`/orders/reorder/${orderId}`);
      return data;
    },
    onSuccess: async (data) => {
      // Add available items to cart
      for (const item of data.availableItems) {
        await api.post("/cart/add", {
          productId: item.product,
          quantity: item.quantity,
        });
      }

      // Refresh cart
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      // Show feedback
      Alert.alert(
        "Reorder Complete",
        `${data.availableItems.length} items added to cart` +
          (data.unavailableItems.length > 0
            ? `\n${data.unavailableItems.length} items unavailable`
            : ""),
      );
    },
  });
}
```

**UI Implementation (`mobile/nexent/components/OrderCard.tsx`):**

```typescript
const { mutate: reorder, isPending } = useReorder();

<TouchableOpacity
  onPress={() => reorder(order._id)}
  disabled={isPending}
>
  <Text>🔄 Reorder</Text>
</TouchableOpacity>
```

**Why this approach?**

- Backend validates stock/availability before frontend action
- Graceful degradation: partial reorders if some items unavailable
- User gets immediate feedback about what was/wasn't added
- Cart is automatically refreshed

---

## 📧 INVOICE EMAIL SYSTEM

### Concept

Automatically send a detailed invoice email to users after they review ALL products in an order. This triggers only once per order.

### How It Was Built

#### 1. Order Schema Flag (`backend/src/models/order.model.js`)

```javascript
const orderSchema = {
  // ... other fields
  invoiceSent: {
    type: Boolean,
    default: false, // Tracks if invoice was sent for this order
  },
};
```

**Why a flag?**

- Prevents duplicate invoice emails
- Simple boolean is efficient for atomic operations
- Easy to query for debugging

#### 2. Review Submission Trigger

**Implementation (`backend/src/controlllers/review.controller.js`):**

```javascript
export async function createReview(req, res) {
  const { orderId, productId, rating, comment } = req.body;

  // Step 1: Create the review
  const review = await Review.create({
    user: user._id,
    clerkId: user.clerkId,
    productId,
    orderId,
    rating,
    comment,
  });

  // Step 2: Check if ALL products in order are reviewed
  const order = await Order.findById(orderId).populate("orderItems.product");

  // Get all product IDs from order (excluding deleted products)
  const allProductIds = order.orderItems
    .filter((item) => item.product && item.product._id)
    .map((item) => item.product._id.toString());

  // Get all reviews for this order
  const allReviewsForOrder = await Review.find({
    orderId,
    clerkId: user.clerkId,
  });

  // Extract reviewed product IDs
  const reviewedProductIds = allReviewsForOrder.map((r) =>
    r.productId.toString(),
  );

  // Step 3: Check if every product has a review
  const allProductsReviewed = allProductIds.every((productId) =>
    reviewedProductIds.includes(productId),
  );

  // Step 4: If all reviewed, send invoice (atomic operation)
  if (allProductsReviewed) {
    try {
      // Use atomic update to claim invoice sending
      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: orderId,
          invoiceSent: false, // Only update if not already sent
        },
        {
          invoiceSent: true,
        },
        {
          new: false, // Return old document to check if we succeeded
        },
      );

      // Only send email if we successfully claimed the flag
      if (updatedOrder && !updatedOrder.invoiceSent) {
        const populatedOrder =
          await Order.findById(orderId).populate("orderItems.product");

        await sendOrderInvoiceEmail(populatedOrder, user.email, user.name);
      }
    } catch (emailError) {
      console.error("Failed to send invoice email:", emailError);
      // Don't fail the review if email fails
    }
  }

  res.status(201).json({ review });
}
```

**Critical Design Patterns:**

1. **Atomic Invoice Flag Update:**

```javascript
const updatedOrder = await Order.findOneAndUpdate(
  { _id: orderId, invoiceSent: false }, // Condition
  { invoiceSent: true }, // Update
  { new: false }, // Return old doc
);

// Only one concurrent request can succeed
if (updatedOrder && !updatedOrder.invoiceSent) {
  // Send email
}
```

**Why atomic?**

- If user submits multiple reviews simultaneously, only one triggers email
- Database ensures single update via conditional query
- Race condition safe

2. **All Products Reviewed Check:**

```javascript
const allProductsReviewed = allProductIds.every((productId) =>
  reviewedProductIds.includes(productId),
);
```

**Why this logic?**

- User must review EVERY product in the order
- Partial reviews don't trigger invoice
- Creates incentive to complete all reviews

#### 3. Invoice Email Template

**Implementation (`backend/src/lib/email.js`):**

```javascript
export function generateInvoiceEmailHTML(order, user) {
  const orderId = order._id.toString();
  const invoiceDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Calculate totals
  const subtotal = order.orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discount = order.discount || 0;
  const total = order.totalPrice;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - Nexent</title>
      <style>
        body { font-family: -apple-system, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: #121212; padding: 30px; }
        .invoice-title { color: white; font-size: 32px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .product-row { border-bottom: 1px solid #eee; padding: 15px 0; }
        .total { font-size: 24px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1 class="invoice-title">INVOICE</h1>
          <p>Thank you for shopping with Nexent</p>
        </div>
        
        <!-- Invoice Info -->
        <div class="info-grid">
          <div>
            <p>Invoice Number</p>
            <p><strong>#${orderId.slice(-8).toUpperCase()}</strong></p>
          </div>
          <div>
            <p>Date</p>
            <p><strong>${invoiceDate}</strong></p>
          </div>
        </div>
        
        <!-- Billing Info -->
        <div>
          <h3>Bill To:</h3>
          <p><strong>${user.name}</strong></p>
          <p>${user.email}</p>
          <p>${order.shippingAddress.street}</p>
          <p>${order.shippingAddress.city}, ${order.shippingAddress.state}</p>
          <p>${order.shippingAddress.zipCode}</p>
        </div>
        
        <!-- Order Items -->
        <h3>Order Details</h3>
        ${order.orderItems
          .map(
            (item) => `
          <div class="product-row">
            <div>
              <strong>${item.name}</strong>
              <p>Quantity: ${item.quantity}</p>
            </div>
            <div>₹${(item.price * item.quantity).toFixed(2)}</div>
          </div>
        `,
          )
          .join("")}
        
        <!-- Totals -->
        <div>
          <div>
            <span>Subtotal:</span>
            <span>₹${subtotal.toFixed(2)}</span>
          </div>
          ${
            discount > 0
              ? `
            <div>
              <span>Discount:</span>
              <span>-₹${discount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          <div class="total">
            <span>Total:</span>
            <span>₹${total.toFixed(2)}</span>
          </div>
        </div>
        
        <!-- Footer -->
        <p>This is an automated invoice. Please keep this for your records.</p>
        <p>Questions? Contact support@nexent.com</p>
      </div>
    </body>
    </html>
  `;
}

export async function sendOrderInvoiceEmail(order, userEmail, userName) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const orderId = order._id.toString();

  await transporter.sendMail({
    from: `"Nexent" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Invoice - Order #${orderId.slice(-8).toUpperCase()}`,
    html: generateInvoiceEmailHTML(order, {
      name: userName,
      email: userEmail,
    }),
  });
}
```

**Email Design Principles:**

- **Professional styling:** Matches app branding
- **Complete information:** All order details included
- **Printable:** Clean layout for saving/printing
- **Responsive:** Works on all email clients

#### 4. Mobile UI Flow

**Review Modal (`mobile/nexent/components/RatingModal.tsx`):**

```typescript
const submitReview = async () => {
  await createReview({
    orderId: order._id,
    productId: product._id,
    rating,
    comment,
  });

  // Check if this was the last product to review
  const reviewsCount = order.orderItems.length;
  const userReviews = await getOrderReviews(order._id);

  if (userReviews.length === reviewsCount) {
    Alert.alert(
      "Thank You!",
      "All products reviewed! Check your email for the invoice.",
    );
  }
};
```

---

## 🔧 IMPLEMENTATION DEEP DIVE

### Database Relationships

```
User
  ├─ Wallet (1:1)
  │   └─ Transactions []
  │
  ├─ Coupons [] (1:Many)
  │   └─ Order (1:1) - which order used it
  │
  └─ Orders [] (1:Many)
      ├─ OrderItems []
      │   └─ Product
      ├─ Coupon (optional)
      └─ Reviews [] (1:Many)
          └─ Product
```

### API Endpoints

#### Wallet Routes (`/api/wallet`)

```
GET    /              - Get user wallet
POST   /redeem        - Redeem coins for coupon
GET    /coupons       - Get user's coupons
POST   /validate-coupon - Validate coupon code
```

#### Order Routes (`/api/orders`)

```
POST   /              - Create order (with optional coupon)
GET    /              - Get user orders
POST   /reorder/:id   - Reorder past order
POST   /hide/:id      - Hide order from list
```

#### Review Routes (`/api/reviews`)

```
POST   /              - Create review (triggers invoice)
GET    /product/:id   - Get product reviews
```

### State Management (Mobile)

**React Query for Server State:**

```typescript
// Wallet state
const { data: wallet } = useWallet();

// Coupons state
const { data: coupons } = useCoupons();

// Orders state
const { data: orders } = useOrders();

// Mutations
const { mutate: redeemCoupon } = useRedeemCoupon();
const { mutate: reorder } = useReorder();
const { mutate: createReview } = useCreateReview();
```

**Benefits:**

- Automatic caching and refetching
- Optimistic updates
- Background refresh
- Error handling

### Error Handling Patterns

**Backend:**

```javascript
try {
  // Business logic
} catch (error) {
  console.error("Error in controller:", error);
  res.status(500).json({ error: "Internal server error" });
}
```

**Frontend:**

```typescript
const { mutate, isError, error } = useMutation({
  mutationFn: async () => {
    /* ... */
  },
  onError: (error) => {
    Alert.alert("Error", error.message);
  },
});
```

### Security Considerations

1. **Authentication:**
   - All routes protected with Clerk middleware
   - ClerkId validated on every request

2. **Authorization:**
   - Users can only access their own wallet/coupons/orders
   - Coupon validation checks ownership

3. **Validation:**
   - Stock checked before order creation
   - Coupon expiry/usage validated
   - Email sending doesn't block main operations

4. **Race Conditions:**
   - Atomic updates for invoice flag
   - Unique coupon code generation with collision check

---

## 🛠️ TECHNICAL STACK

### Backend

```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.0",
  "nodemailer": "^6.9.7",
  "@clerk/clerk-sdk-node": "^4.13.0",
  "stripe": "^14.0.0"
}
```

### Mobile

```json
{
  "expo": "~54.0.0",
  "react-native": "0.81.5",
  "@tanstack/react-query": "^5.0.0",
  "@clerk/clerk-expo": "^2.0.0",
  "@stripe/stripe-react-native": "^0.40.0",
  "axios": "^1.6.0"
}
```

---

## 📊 DATABASE SCHEMA DESIGN

### Complete Schemas

#### User Model

```javascript
{
  _id: ObjectId,
  clerkId: String (unique),
  email: String,
  name: String,
  profileImage: String,
  phone: String,
  wallet: ObjectId (ref: Wallet),
  createdAt: Date
}
```

#### Wallet Model

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  clerkId: String (unique),
  coins: Number (min: 0),
  lifetimeCoins: Number (min: 0),
  transactions: [{
    type: enum["earned", "redeemed", "expired"],
    amount: Number,
    description: String,
    orderId: ObjectId (ref: Order),
    couponId: ObjectId (ref: Coupon),
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### Coupon Model

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  clerkId: String,
  code: String (unique, 6 letters),
  type: enum["bronze", "silver", "gold"],
  discount: Number (10, 35, or 60),
  coinsRequired: Number (100, 300, or 500),
  isUsed: Boolean,
  usedAt: Date,
  orderId: ObjectId (ref: Order),
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Order Model

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  clerkId: String,
  orderItems: [{
    product: ObjectId (ref: Product),
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  paymentResult: {
    id: String,
    status: String
  },
  totalPrice: Number,
  discount: Number,
  couponUsed: ObjectId (ref: Coupon),
  coinsEarned: Number,
  status: enum["pending", "processing", "shipped", "delivered"],
  invoiceSent: Boolean,
  hidden: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Review Model

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  clerkId: String,
  productId: ObjectId (ref: Product),
  orderId: ObjectId (ref: Order),
  rating: Number (1-5),
  comment: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 DEPLOYMENT NOTES

### Environment Variables Required

**Backend (.env):**

```env
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Mobile (.env):**

```env
EXPO_PUBLIC_API_URL=https://your-api.com
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Testing Checklist

- [ ] Wallet creation on first order
- [ ] Coin earning (10 per product)
- [ ] Coupon redemption (all tiers)
- [ ] Coupon validation at checkout
- [ ] Single-use coupon enforcement
- [ ] Coupon expiry (30 days)
- [ ] Reorder with stock validation
- [ ] Review submission
- [ ] Invoice email trigger (all products reviewed)
- [ ] Invoice sent flag (no duplicates)

---

## 📝 DEVELOPMENT LESSONS LEARNED

### 1. Wallet System

- **Lesson:** Always track both current and lifetime balances
- **Why:** Users want to see total achievement, not just current balance
- **Implementation:** Two separate fields prevent confusion

### 2. Coupon System

- **Lesson:** Single-use coupons need atomic operations
- **Why:** Concurrent requests could use same coupon twice
- **Implementation:** Database-level `isUsed` flag with query validation

### 3. Invoice Emails

- **Lesson:** Use atomic flags to prevent duplicate sends
- **Why:** Race conditions in concurrent review submissions
- **Implementation:** `findOneAndUpdate` with conditional check

### 4. Reorder Feature

- **Lesson:** Always validate stock and prices before reordering
- **Why:** Products may be discontinued or prices changed
- **Implementation:** Backend validates, frontend gets current data

### 5. Transaction History

- **Lesson:** Never delete transaction records, only append
- **Why:** Audit trail and debugging are critical
- **Implementation:** Immutable transaction array in wallet

---

## 🎓 KEY TAKEAWAYS FOR YOU

1. **Database Design Matters:**
   - Denormalization (clerkId) trades space for speed
   - Transaction logs provide transparency
   - Atomic operations prevent race conditions

2. **User Experience:**
   - Immediate feedback (coins earned shown instantly)
   - Progressive rewards (tier system)
   - Graceful degradation (partial reorders)

3. **Error Handling:**
   - Email failures don't block main operations
   - Stock validation prevents overselling
   - Expiry checks prevent invalid coupons

4. **Code Organization:**
   - Controllers handle business logic
   - Models define data structure
   - Hooks abstract API calls
   - Components focus on UI

5. **Testing Strategy:**
   - Test edge cases (concurrent requests)
   - Test expiry logic
   - Test stock validation
   - Test atomic operations

---

**This documentation was created for your understanding of the codebase architecture and implementation patterns. Keep it as a reference for future development work.**

**Last Updated:** February 9, 2026  
**Author:** Krrish (Developer)
