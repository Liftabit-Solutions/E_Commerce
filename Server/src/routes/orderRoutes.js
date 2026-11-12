import express from "express";
import verifyToken, { verifyOptionalToken } from "../middlewares/auth.js";
import {
    cancelOrder,
    getMyOrders,
    placeCODOrder,
    updateOrderStatus,
    sendInvoiceEmail,
    returnOrder,
    createRazorpayUpiOrder,
    verifyRazorpayUpiPayment
} from "../controllers/orderController.js";
import verifyAdmin from "../middlewares/admin.js";


const orderRouter = express.Router();
orderRouter.post("/place-order", verifyToken, placeCODOrder);
orderRouter.post("/create-payment-order", verifyToken, createRazorpayUpiOrder);
orderRouter.post("/create-upi-order", verifyToken, createRazorpayUpiOrder);
orderRouter.post("/verify-payment", verifyToken, verifyRazorpayUpiPayment);
orderRouter.post("/verify-upi-payment", verifyToken, verifyRazorpayUpiPayment);
orderRouter.get("/my-orders", verifyToken, getMyOrders);
orderRouter.delete("/cancel/:orderId", verifyToken, cancelOrder);
orderRouter.post("/return/:orderId", verifyToken, returnOrder);
orderRouter.post("/:orderId/return", verifyToken, returnOrder);
orderRouter.post("/send-invoice-email", verifyToken, sendInvoiceEmail);
orderRouter.put("/:id/status", verifyToken, updateOrderStatus);


export default orderRouter;