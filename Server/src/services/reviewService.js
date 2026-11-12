import { User } from "../models/User.js";
import { Review } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { Story } from "../models/Story.js";

export const getMyReviewsService = async (req) => {
    const { uid } = req.user;

    const user = await User.findOne({
        uid,
        isDeleted: false
    });

    if (!user) {
        throw new Error("User not found.");
    }

    const reviews = await Review.find({
        user: user._id,
        isDeleted: false
    })
        .populate({
            path: "product",
            select: "title images"
        })
        .sort({ createdAt: -1 });

    const stories = await Story.find({
        $or: [
            { user: user._id },
            { author: user.name }
        ],
        isDeleted: false
    }).sort({ createdAt: -1 });

    return { reviews, stories };
};


export const deleteReviewService = async (req) => {
    const { reviewId } = req.params;
    const { uid } = req.user;

    const user = await User.findOne({
        uid,
        isDeleted: false
    });

    if (!user) {
        throw new Error("User not found.");
    }

    // 1. Check if reviewId belongs to a Story
    const story = await Story.findOne({ _id: reviewId, isDeleted: false });
    const isAdmin = Boolean(user.isAdmin && user.role === "Admin");

    if (story) {
        const isOwner = Boolean(story.user && story.user.toString() === user._id.toString());

        if (!isOwner && !isAdmin) {
            throw new Error("You are not authorized to delete this story.");
        }

        story.isDeleted = true;
        await story.save();
        return story;
    }

    // 2. Fallback to Product Review
    const review = await Review.findOne({ _id: reviewId, isDeleted: false });

    if (!review) {
        throw new Error("Review or Story not found.");
    }

    const isReviewOwner = Boolean(review.user && review.user.toString() === user._id.toString());
    if (!isReviewOwner && !isAdmin) {
        throw new Error("You are not authorized to delete this review.");
    }

    review.isDeleted = true;
    await review.save();

    await User.findByIdAndUpdate(
        user._id,
        { $pull: { reviews: review._id } }
    );

    if (review.product) {
        await Product.findByIdAndUpdate(
            review.product,
            { $pull: { reviews: review._id } }
        );

        const approvedReviews = await Review.find({
            product: review.product,
            status: "Approved",
            isDeleted: false
        });

        const totalReviews = approvedReviews.length;
        const totalRating = approvedReviews.reduce((sum, item) => sum + item.rating, 0);
        const averageRating = totalReviews === 0 ? 0 : Number((totalRating / totalReviews).toFixed(1));

        await Product.findByIdAndUpdate(
            review.product,
            { averageRating, totalReviews }
        );
    }

    return review;
};