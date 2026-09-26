import express from "express";
import authRoutes from "./auth.js";
import configRoutes from "./config.js";
import generatorsRoutes from "./generators.js";
import notificationsRoutes from "./notifications.js";
import usersRoutes from "./users.js";

const router = express.Router();

router.use(authRoutes);
router.use(configRoutes);
router.use(generatorsRoutes);
router.use(notificationsRoutes);
router.use(usersRoutes);

export default router;
