import { Router, type IRouter } from "express";
import authRouter from "./auth";
import bookingsRouter from "./bookings";
import healthRouter from "./health";
import notificationsRouter from "./notifications";
import onboardingRouter from "./onboarding";
import paymentsRouter from "./payments";
import placesRouter from "./places";
import profileRouter from "./profile";
import providersRouter from "./providers";
import reviewsRouter from "./reviews";
import servicesRouter from "./services";
import statsRouter from "./stats";
import subscriptionsRouter from "./subscriptions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(servicesRouter);
router.use(providersRouter);
router.use(bookingsRouter);
router.use(profileRouter);
router.use(notificationsRouter);
router.use(paymentsRouter);
router.use(placesRouter);
router.use(onboardingRouter);
router.use(statsRouter);
router.use(reviewsRouter);
router.use(subscriptionsRouter);

export default router;
