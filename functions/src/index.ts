import * as admin from "firebase-admin";

admin.initializeApp();

export { renewExpiredWatchChannels } from "./gcal/renewWatchChannels";