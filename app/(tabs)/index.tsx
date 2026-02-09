import ProductsGrid from "../../components/ProductGrid";
import SafeScreen from "@/components/SafeScreen";
import { useProducts } from "@/hooks/useProducts";
import useRecommendations from "@/hooks/useRecommendations";
import { Product } from "@/types";
import { router } from "expo-router";
import FilterModal, { FilterType } from "@/components/FilterModal";

import { Ionicons } from "@expo/vector-icons";

import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";

const CATEGORIES = [
  { name: "All", icon: "grid-outline" as const },
  {
    name: "Electronics",
    image: require("../../assets/images/Electronics.png"),
  },
  { name: "Fashion", image: require("../../assets/images/Fashion.png") },
  { name: "Books", image: require("../../assets/images/books.png") },
  { name: "Sports", image: require("../../assets/images/sports.png") },
  { name: "Home & Kitchen", image: require("../../assets/images/home.png") },
  { name: "Beauty", image: require("../../assets/images/beauty.png") },
  { name: "Grocery", image: require("../../assets/images/grocery.png") },
  { name: "Toys & Kids", image: require("../../assets/images/toys.png") },
];

const ShopScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterType[]>(["none"]);

  const { data: products, isLoading, isError } = useProducts();
  const { data: recommendations } = useRecommendations();

  const handleFilterSelect = (filters: FilterType[]) => {
    setCurrentFilters(filters);
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products;

    // filtering by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter(
        (product: Product) => product.category === selectedCategory,
      );
    } else {
      // When "All" is selected, show only 2 products from each category
      const productsByCategory: { [key: string]: Product[] } = {};
      products.forEach((product: Product) => {
        if (!productsByCategory[product.category]) {
          productsByCategory[product.category] = [];
        }
        if (productsByCategory[product.category].length < 2) {
          productsByCategory[product.category].push(product);
        }
      });
      filtered = Object.values(productsByCategory).flat();
    }

    // filtering by search query - search in name, description, and category
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product: Product) =>
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query),
      );
    }

    // Apply multiple filters
    if (currentFilters.length > 0 && !currentFilters.includes("none")) {
      // First apply any rating/quality filters
      if (currentFilters.includes("bestseller")) {
        filtered = [...filtered].sort((a, b) => {
          const ratingA = a.averageRating || 0;
          const ratingB = b.averageRating || 0;
          if (ratingB !== ratingA) return ratingB - ratingA;
          return (b.totalReviews || 0) - (a.totalReviews || 0);
        });
      }

      if (currentFilters.includes("worst")) {
        filtered = [...filtered].sort((a, b) => {
          const ratingA = a.averageRating || 0;
          const ratingB = b.averageRating || 0;
          if (ratingA !== ratingB) return ratingA - ratingB;
          return (a.totalReviews || 0) - (b.totalReviews || 0);
        });
      }

      if (currentFilters.includes("low-rating")) {
        filtered = filtered.filter((p) => (p.averageRating || 0) < 3);
      }

      // Then apply price sorting (only one can be active)
      if (currentFilters.includes("price-high")) {
        filtered = [...filtered].sort((a, b) => b.price - a.price);
      } else if (currentFilters.includes("price-low")) {
        filtered = [...filtered].sort((a, b) => a.price - b.price);
      }
    }

    return filtered;
  }, [products, selectedCategory, searchQuery, currentFilters]);

  return (
    <SafeScreen>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View className="px-6 pb-4 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-text-primary text-3xl font-bold tracking-tight">
                Shop
              </Text>
              <Text className="text-text-secondary text-sm mt-1">
                Browse all products
              </Text>
            </View>

            <TouchableOpacity
              className="bg-surface/50 p-3 rounded-full"
              activeOpacity={0.7}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="options-outline" size={22} color={"#fff"} />
            </TouchableOpacity>
          </View>

          {/* SEARCH BAR */}
          <View className="bg-surface flex-row items-center px-5 py-4 rounded-2xl">
            <Ionicons color={"#666"} size={22} name="search" />
            <TextInput
              placeholder="Search for products"
              placeholderTextColor={"#666"}
              className="flex-1 ml-3 text-base text-text-primary"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* CATEGORY FILTER */}
        <View className="mb-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category.name;
              return (
                <TouchableOpacity
                  key={category.name}
                  onPress={() => setSelectedCategory(category.name)}
                  className={`mr-3 rounded-2xl size-20 overflow-hidden items-center justify-center ${isSelected ? "bg-primary" : "bg-surface"}`}
                >
                  {category.icon ? (
                    <Ionicons
                      name={category.icon}
                      size={36}
                      color={isSelected ? "#121212" : "#fff"}
                    />
                  ) : (
                    <Image
                      source={category.image}
                      className="size-12"
                      resizeMode="contain"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* RECOMMENDATIONS SECTION */}
        {recommendations && recommendations.length > 0 && (
          <View className="px-6 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-text-primary text-xl font-bold">
                  Our Recommendations
                </Text>
                <Text className="text-text-secondary text-sm mt-1">
                  Curated just for you
                </Text>
              </View>
              <Ionicons name="sparkles" size={24} color="#ffd700" />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16 }}
            >
              {recommendations.slice(0, 6).map((rec) => (
                <TouchableOpacity
                  key={rec.product._id}
                  onPress={() => router.push(`/product/${rec.product._id}`)}
                  className="bg-surface rounded-2xl overflow-hidden"
                  style={{ width: 220 }}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: rec.product.images[0] }}
                    className="w-full h-40"
                    resizeMode="cover"
                  />
                  <View className="p-4">
                    <Text
                      className="text-text-primary font-semibold mb-1 text-base"
                      numberOfLines={2}
                    >
                      {rec.product.name}
                    </Text>
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="information-circle"
                        size={14}
                        color="#667eea"
                      />
                      <Text
                        className="text-xs text-primary ml-1"
                        numberOfLines={1}
                      >
                        {rec.reason}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-text-primary font-bold text-lg">
                        ${rec.product.price.toFixed(2)}
                      </Text>
                      {rec.product.averageRating &&
                        rec.product.averageRating > 0 && (
                          <View className="flex-row items-center">
                            <Ionicons name="star" size={14} color="#ffd700" />
                            <Text className="text-text-secondary text-xs ml-1">
                              {rec.product.averageRating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-text-primary text-lg font-bold">
              Products
            </Text>
            <Text className="text-text-secondary text-sm">
              {filteredProducts.length} items
            </Text>
          </View>

          {/* PRODUCTS GRID */}
          <ProductsGrid
            products={filteredProducts}
            isLoading={isLoading}
            isError={isError}
          />
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onFilterSelect={handleFilterSelect}
        currentFilters={currentFilters}
      />
    </SafeScreen>
  );
};

export default ShopScreen;
