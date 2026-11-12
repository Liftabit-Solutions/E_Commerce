import { Product } from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import { emitToAll } from "../socket/index.js";


export const addProduct = async (req, res) => {
    try {

        const {
            title,
            sku,
            brand,
            category,
            badge,
            tags,
            description,

            retailPrice,
            discountPercentage,

            stock,
            minStockAlert,

            containerSize,
            usageInstructions,
            phLevel,
            suitableSurfaces,

            metaTitle,
            metaDescription,
            metaKeywords
        } = req.body;

        // ===========================
        // Validate Required Fields
        // ===========================

        if (
            !title ||
            !sku ||
            !brand ||
            !category ||
            !description ||
            retailPrice == null ||
            stock == null ||
            !containerSize ||
            !usageInstructions ||
            !phLevel ||
            !suitableSurfaces
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        // ===========================
        // Check Existing SKU
        // ===========================

        const existingProduct = await Product.findOne({
            sku: sku.toUpperCase(),
            isDeleted: false
        });

        if (existingProduct) {
            return res.status(409).json({
                success: false,
                message: "Product with this SKU already exists."
            });
        }

        // ===========================
        // Calculate Selling Price
        // ===========================

            const sellingPrice = Math.round(
            Number(retailPrice) -
            (Number(retailPrice) * Number(discountPercentage || 0)) / 100
        );
            console.log("Selling Price:", sellingPrice);
            console.log(typeof sellingPrice);

        // ===========================
        // Upload Images to Cloudinary
        // ===========================

        const uploadedImages = [];

        if (req.files && req.files.length > 0) {

            for (const file of req.files) {

                const result = await uploadToCloudinary(file.buffer);

                uploadedImages.push({
                    url: result.secure_url,
                    public_id: result.public_id
                });

            }

        }

        // ===========================
        // Create Product
        // ===========================

        const product = await Product.create({

            title,

            sku: sku.toUpperCase(),

            brand,

            category,

            badge,

            tags: tags
                ? tags.split(",").map(tag => tag.trim())
                : [],

            description,

            retailPrice: Number(retailPrice),

            discountPercentage: Number(discountPercentage || 0),

            sellingPrice,

            stock: Number(stock),

            totalPurchased: Number(stock),

            minStockAlert: Number(minStockAlert || 5),

            specifications: {

                containerSize,

                usageInstructions,

                phLevel,

                suitableSurfaces

            },

            images: uploadedImages,

            seo: {

                metaTitle,

                metaDescription,

                metaKeywords: metaKeywords
                    ? metaKeywords
                        .split(",")
                        .map(keyword => keyword.trim())
                    : []

            }

        });

        // Real-time synchronization
        emitToAll("product:created", { product });

        return res.status(201).json({
            success: true,
            message: "Product added successfully.",
            product
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to add product.",
            error: error.message
        });

    }
};



const escapeRegex = (str) => String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

//get all products

export const getAllProducts = async (req, res) => {

    try {

        let {
            page = 1,
            limit = 12,
            search = "",
            category,
            sort = "newest"
        } = req.query;

        page = Math.max(1, Number(page) || 1);
        limit = Math.min(Math.max(1, Number(limit) || 12), 1000);

        // ===========================
        // Build Filter
        // ===========================

        const filter = {
            isDeleted: false,
        };

        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === "true";
        }

        if (category && category !== "All") {
            filter.category = category;
        }

        if (search && search.trim()) {
            const escapedSearch = escapeRegex(search.trim());
            filter.$or = [
                {
                    title: {
                        $regex: escapedSearch,
                        $options: "i"
                    }
                },
                {
                    tags: {
                        $regex: escapedSearch,
                        $options: "i"
                    }
                }
            ];
        }

        // ===========================
        // Sorting
        // ===========================

        let sortOption = {};

        switch (sort) {

            case "priceLow":
                sortOption = { sellingPrice: 1 };
                break;

            case "priceHigh":
                sortOption = { sellingPrice: -1 };
                break;

            case "rating":
                sortOption = { averageRating: -1 };
                break;

            case "bestSelling":
                sortOption = { sold: -1 };
                break;

            case "oldest":
                sortOption = { createdAt: 1 };
                break;

            default:
                sortOption = { createdAt: -1 };

        }

        // ===========================
        // Get Products
        // ===========================

        const products = await Product.find(filter)
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(limit);

        // ===========================
        // Count Products
        // ===========================

        const totalProducts = await Product.countDocuments(filter);

        return res.status(200).json({

            success: true,

            currentPage: page,

            totalPages: Math.ceil(totalProducts / limit),

            totalProducts,

            products

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Failed to fetch products.",

            error: error.message

        });

    }

};



// update product
export const updateProduct = async (req, res) => {
    try {

        const { id } = req.params;

        const {
            title,
            sku,
            brand,
            category,
            badge,
            status,
            tags,
            description,
          
            retailPrice,
            discountPercentage,
            stock,
            minStockAlert,

            containerSize,
            usageInstructions,
            phLevel,
            suitableSurfaces,

            metaTitle,
            metaDescription,
            metaKeywords,

            deletedImages
        } = req.body;

        // =====================================
        // Find Product
        // =====================================
        console.log(status);
        
        const product = await Product.findOne({
            _id: id,
            isDeleted: false
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        // =====================================
        // Check SKU
        // =====================================

        if (sku && sku !== product.sku) {

            const existingSku = await Product.findOne({
                sku: sku.toUpperCase(),
                _id: { $ne: id },
                isDeleted: false
            });

            if (existingSku) {
                return res.status(409).json({
                    success: false,
                    message: "SKU already exists."
                });
            }

            product.sku = sku.toUpperCase();
        }

        // =====================================
        // Basic Details
        // =====================================

        if (title) product.title = title;

        if (brand) product.brand = brand;

        if (category) product.category = category;

        if (badge) product.badge = badge;

                if (status !== undefined) {
            switch (status.toLowerCase()) {
                case "active":
                    product.isActive = true;
                    break;

                case "draft":
                    product.isActive = false;
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: "Invalid status. Allowed values are Active or Draft."
                    });
            }
        }

        if (description) product.description = description;

        if (tags) {
            product.tags = tags
                .split(",")
                .map(tag => tag.trim())
                .filter(Boolean);
        }

        // =====================================
        // Pricing
        // =====================================

        if (retailPrice !== undefined)
            product.retailPrice = Number(retailPrice);

        if (discountPercentage !== undefined)
            product.discountPercentage = Number(discountPercentage);

            product.sellingPrice = Math.round(
            Number(product.retailPrice) -
            (
                Number(product.retailPrice) *
                Number(product.discountPercentage || 0)
            ) / 100
        );

        // =====================================
        // Inventory
        // =====================================

        if (stock !== undefined) {

            const newStock = Number(stock);

            const addedStock = newStock - product.stock;

            if (addedStock > 0) {
                product.totalPurchased += addedStock;
            }

            product.stock = newStock;
        }

        if (minStockAlert !== undefined)
            product.minStockAlert = Number(minStockAlert);

        // =====================================
        // Specifications
        // =====================================

        if (containerSize)
            product.specifications.containerSize = containerSize;

        if (usageInstructions)
            product.specifications.usageInstructions = usageInstructions;

        if (phLevel)
            product.specifications.phLevel = phLevel;

        if (suitableSurfaces)
            product.specifications.suitableSurfaces = suitableSurfaces;

        // =====================================
        // SEO
        // =====================================

        if (metaTitle !== undefined)
            product.seo.metaTitle = metaTitle;

        if (metaDescription !== undefined)
            product.seo.metaDescription = metaDescription;

        if (metaKeywords !== undefined) {
            product.seo.metaKeywords = metaKeywords
                .split(",")
                .map(keyword => keyword.trim())
                .filter(Boolean);
        }

        // =====================================
        // Delete Images
        // =====================================

        if (deletedImages) {

            const imagesToDelete = JSON.parse(deletedImages);

            for (const publicId of imagesToDelete) {
                await cloudinary.uploader.destroy(publicId);
            }

            product.images = product.images.filter(
                image => !imagesToDelete.includes(image.public_id)
            );
        }

        // =====================================
        // Upload New Images
        // =====================================

        if (req.files && req.files.length > 0) {

            const remainingImages = product.images.length;

            if (remainingImages + req.files.length > 5) {
                return res.status(400).json({
                    success: false,
                    message: "Maximum 5 product images are allowed."
                });
            }

            for (const file of req.files) {

                const uploaded = await uploadToCloudinary(file.buffer);

                product.images.push({
                    url: uploaded.secure_url,
                    public_id: uploaded.public_id
                });

            }

        }

        // =====================================
        // Save Product
        // =====================================

        await product.save();

        // Real-time synchronization
        emitToAll("product:updated", { product });
        if (stock !== undefined) {
            emitToAll("inventory:updated", { productId: product._id, stock: product.stock });
        }

        return res.status(200).json({
            success: true,
            message: "Product updated successfully.",
            product
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to update product.",
            error: error.message
        });

    }
};


//delete a product
export const deleteProduct = async (req, res) => {
    try {

        const { id } = req.params;

        const product = await Product.findOne({
            _id: id,
            isDeleted: false
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        // Soft Delete
        product.isDeleted = true;

        await product.save();

        // Real-time synchronization
        emitToAll("product:deleted", { id: product._id, _id: product._id, sku: product.sku });

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete product.",
            error: error.message
        });

    }
};

// bulk delete products
export const bulkDeleteProducts = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No product IDs provided for deletion."
            });
        }

        const products = await Product.find({
            _id: { $in: ids },
            isDeleted: false
        });

        if (!products || products.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active products found to delete."
            });
        }

        await Product.updateMany(
            { _id: { $in: ids }, isDeleted: false },
            { $set: { isDeleted: true } }
        );

        products.forEach((product) => {
            emitToAll("product:deleted", { id: product._id, _id: product._id, sku: product.sku });
        });

        return res.status(200).json({
            success: true,
            message: `${products.length} product(s) deleted successfully.`
        });
    } catch (error) {
        console.error("Bulk delete error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete products.",
            error: error.message
        });
    }
};