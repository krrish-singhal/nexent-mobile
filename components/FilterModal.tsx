import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onFilterSelect: (filters: FilterType[]) => void;
  currentFilters: FilterType[];
}

export type FilterType =
  | "none"
  | "bestseller"
  | "worst"
  | "low-rating"
  | "price-high"
  | "price-low";

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onFilterSelect,
  currentFilters,
}) => {
  const [selectedFilters, setSelectedFilters] =
    useState<FilterType[]>(currentFilters);

  useEffect(() => {
    setSelectedFilters(currentFilters);
  }, [currentFilters, visible]);

  const toggleFilter = (filterId: FilterType) => {
    setSelectedFilters((prev) => {
      if (filterId === "none") {
        return [];
      }
      const withoutNone = prev.filter((f) => f !== "none");
      if (withoutNone.includes(filterId)) {
        return withoutNone.filter((f) => f !== filterId);
      } else {
        return [...withoutNone, filterId];
      }
    });
  };

  const handleApplyFilters = () => {
    onFilterSelect(selectedFilters.length === 0 ? ["none"] : selectedFilters);
    onClose();
  };

  const handleClearAll = () => {
    setSelectedFilters([]);
  };

  const filters = [
    {
      id: "none" as FilterType,
      name: "All Products",
      icon: "grid-outline" as const,
      description: "Show all products",
    },
    {
      id: "bestseller" as FilterType,
      name: "Best Sellers",
      icon: "trending-up" as const,
      description: "Highest rated products",
    },
    {
      id: "worst" as FilterType,
      name: "Worst Sellers",
      icon: "trending-down" as const,
      description: "Lowest rated products",
    },
    {
      id: "low-rating" as FilterType,
      name: "Low Rating",
      icon: "sad-outline" as const,
      description: "Products with poor reviews",
    },
    {
      id: "price-high" as FilterType,
      name: "Price: High to Low",
      icon: "arrow-down" as const,
      description: "Most expensive first",
    },
    {
      id: "price-low" as FilterType,
      name: "Price: Low to High",
      icon: "arrow-up" as const,
      description: "Cheapest first",
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Products</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <ScrollView
            style={styles.filtersList}
            showsVerticalScrollIndicator={false}
          >
            {filters.map((filter) => {
              const isSelected =
                filter.id === "none"
                  ? selectedFilters.length === 0 ||
                    selectedFilters.includes("none")
                  : selectedFilters.includes(filter.id);
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={styles.filterItem}
                  onPress={() => toggleFilter(filter.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.filterIconContainer,
                      isSelected && styles.filterIconContainerSelected,
                    ]}
                  >
                    <Ionicons
                      name={filter.icon}
                      size={24}
                      color={isSelected ? "#121212" : "#1DB954"}
                    />
                  </View>
                  <View style={styles.filterTextContainer}>
                    <Text
                      style={[
                        styles.filterName,
                        isSelected && styles.filterNameSelected,
                      ]}
                    >
                      {filter.name}
                    </Text>
                    <Text style={styles.filterDescription}>
                      {filter.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color="#1DB954" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApplyFilters}
              activeOpacity={0.7}
            >
              <Text style={styles.applyButtonText}>
                Apply{" "}
                {selectedFilters.length > 0
                  ? `(${selectedFilters.length})`
                  : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    padding: 4,
  },
  filtersList: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  filterItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  filterItemSelected: {
    backgroundColor: "#1DB954",
  },
  filterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1DB954",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  filterIconContainerSelected: {
    backgroundColor: "#121212",
  },
  filterTextContainer: {
    flex: 1,
  },
  filterName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  filterNameSelected: {
    color: "#121212",
  },
  filterDescription: {
    fontSize: 13,
    color: "#999",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#666",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#121212",
    borderColor: "#1DB954",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  clearButton: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    backgroundColor: "#1DB954",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#121212",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default FilterModal;
