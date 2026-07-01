import { createContext, useContext, useState, type ReactNode } from "react";
import { apiUrl } from '@/lib/api'

export interface Review {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  reviewText: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email?: string;
  };
  product?: {
    id: number;
    name: string;
    brand?: string;
  };
}

interface ReviewsContextType {
  reviews: Review[];
  addReview: (
    productId: number,
    rating: number,
    reviewText: string,
    token: string
  ) => Promise<Review | null>;
  getProductReviews: (productId: number) => Promise<Review[]>;
  getAverageRating: (
    productId: number
  ) => Promise<{average: number; count: number}>;
  deleteReview: (
    reviewId: number,
    token: string
  ) => Promise<boolean>;
  loading: boolean;
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);

export function ReviewsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const addReview = async (
    productId: number,
    rating: number,
    reviewText: string,
    token: string
  ) => {
    const response = await fetch(apiUrl('/api/reviews'), {      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId,
        rating,
        reviewText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "An error occured");
    }

    const newReview = await response.json();

    setReviews((prev) => [newReview, ...prev]);

    return newReview;
  };

  const getProductReviews = async (productId: number) => {
    setLoading(true);

    try {
      const response = await fetch(
        apiUrl(`/api/reviews/product/${productId}`)
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }

      const data = await response.json();
      setReviews(data);
      return data;

    } catch (err) {
      console.error("getProductReviews error: ",  err);
      return [];

    } finally {
      setLoading(false);
    }
  };

  const getAverageRating = async (productId: number) => {
    try {
      const response = await fetch(
        apiUrl(`/api/reviews/product/${productId}/average`)
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch average rating");
      }

      const data = await response.json();
      return data;

    } catch (err) {
      console.error("getAverageRating error: ", err);
      return {average: 0, count: 0};
    }
  };

  const deleteReview = async (
    reviewId: number,
    token: string
  ) =>  {
    setLoading(true);

    try {
      const response = await fetch(apiUrl(`/api/reviews/${reviewId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to delete review"
        );
      }

    setReviews((prev) =>
      prev.filter((review) => review.id !== reviewId));
    return true;

    } catch (err) {
      console.error("deleteReview error: ", err);
      return false;

    } finally {
      setLoading(false);
    }
  };

  return (
    <ReviewsContext.Provider
    value={{
      reviews,
      addReview,
      getProductReviews,
      getAverageRating,
      deleteReview,
      loading,
    }}
    >
      {children}
    </ReviewsContext.Provider>
  );
}

export function useReviews() {
  const context = useContext(ReviewsContext);

  if (context === undefined) {
    throw new Error(
      "useReview must be used within a ReviewsProvider"
    );
  }

  return context;
}