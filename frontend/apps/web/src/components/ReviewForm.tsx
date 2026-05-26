import React, { useState, type FormEvent } from "react";
import { X, Star } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useReviews } from "@/context/ReviewsContext";
import { useAuth } from "@/context/AuthContext";

interface ReviewFormProps {
    productId: number;
    isOpen: boolean;
    onClose: () => void;
    onReviewAdded: () => void;
}

export default function ReviewForm({
    productId,
    isOpen,
    onClose,
    onReviewAdded,
}: ReviewFormProps) {
    const { token } = useAuth();
    const { addReview, loading } = useReviews();

    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setSubmitError(null);
        setSuccess(false);

        if (!token) {
            setSubmitError("Sie müssen angemeldet sein, um eine Bewertung zu schreiben.");
            return;
        }

        if (rating === 0) {
            setSubmitError("Bitte wählen Sie eine Bewertung.");
            return;
        }

        if (!reviewText.trim()) {
            setSubmitError("Bitte schreiben Sie einen Kommentar.");
            return;
        }

        try {
            await addReview(productId, rating, reviewText, token);

            setSuccess(true);
            setRating(0);
            setReviewText("");

            onReviewAdded();

            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 1500);
        } catch (err) {
            setSubmitError(
                err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
            );
        }
    }

    function handleClose() {
        setRating(0);
        setReviewText("");
        setSubmitError(null);
        setSuccess(false);
        onClose();
    }

    return (
        <div className=" fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#F5E6D3] relative">

            {/*Content*/}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">

                {/*Close button*/}
                <button
                type="button"
                onClick={handleClose}
                className="absolute top-6 right-6 text-muted-foreground hover:text-[#D4A574] transition-colors p-1"
                aria-label="Schließen">
                    <X className="h-5 w-5"/>
                </button>

                {/*Rating*/}
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-4">
                        Wie war Ihre Erfahrung?
                    </label>

                    <div className="flex gap-3 justify-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                className="transition-all hover:scale-125 active:scale-95"
                            >
                                <Star
                                    className={cn("h-10 w-10 transition-all stroke-0",
                                        star <= (hoveredRating || rating) ? "fill-[#D4A574] text-[#D4A574]" : "fill-[#E8D5C0] text-[#E8D5C0]"
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/*ReviewText*/}
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                        Schreiben Sie Ihren Kommentar
                    </label>

                    <textarea
                        value={reviewText}
                        onChange={(e) => 
                            setReviewText(e.target.value.slice(0,500))
                        }
                        placeholder="Ihre Erfahrung mit diesem Produkt..."
                        className="w-full px-4 py-3 border-2 border-[#F5E6D3] rounded-lg focus:outline-none focus:border-[#D4A574] focus:ring-2 focus:ring-[#F5E6D3] resize-none bg-white/50"
                        rows={5}
                    />
                    <p
                    className={cn("text-xs mt-2 transition-colors",
                        reviewText.length > 450 ? "text-[#D4A574]" : "text-muted-foreground"
                    )}>
                        {reviewText.length}/500 Zeichen
                    </p>
                </div>

                {/*Error*/}
                {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 font-medium">
                            {submitError}
                        </p>
                    </div>
                )}

                {/*Success*/}
                {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg animate-in fade-in">
                        <p className="text-sm text-green-700 font-medium">
                            Bewertung erfolgreich hinzugefügt
                        </p>
                    </div>
                )}

                {/*Buttons*/}
                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="flex-1 border-[#D4A574] text-[#D4A574] hover:bg-[#F5E6D3]"
                        disabled={loading}
                    >
                        Abbrechen
                    </Button>

                    <Button
                        type="submit"
                        className="flex-1 bg-[#D4A574] text-white hover:bg-[#C19660] font-medium rounded-lg"
                        disabled={loading}
                    >
                        {loading ? "Wird gesendet..." : "Bewertung posten"}
                    </Button>
                </div>
            </form>
            </div>
        </div>
    )
}