import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./azure-auth";
import appointmentsRouter from "./azure-appointments";
import slotsRouter from "./azure-slots";
import profilesRouter from "./azure-profiles";
import documentsRouter from "./azure-documents";
import catalogueRouter from "./catalogue";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/catalogue", catalogueRouter); // public service list

// Protected routes — require valid JWT
router.use("/appointments", requireAuth, appointmentsRouter);
router.use("/slots", requireAuth, slotsRouter);
router.use("/profiles", requireAuth, profilesRouter);
router.use("/documents", requireAuth, documentsRouter);

export default router;
