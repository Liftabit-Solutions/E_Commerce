import express from 'express';
import { getStories, createStory, deleteStory } from '../controllers/storyController.js';
import { getAuth } from "firebase-admin/auth";
import verifyToken from "../middlewares/auth.js";

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            if (token) {
                const decoded = await getAuth().verifyIdToken(token);
                req.user = decoded;
            }
        }
    } catch (err) {
        console.warn("[optionalAuth] Token verification skipped/failed:", err.message);
    }
    next();
};

const storyRouter = express.Router();

storyRouter.get('/', getStories);
storyRouter.post('/', optionalAuth, createStory);
storyRouter.post('/submit', optionalAuth, createStory);
storyRouter.delete('/:id', verifyToken, deleteStory);

export default storyRouter;
