import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { UserModel } from "../models/userModel";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
    },
    async (accessToken, refreshToken, profile: Profile, done) => {
      try {
        // 1. Check if this Google account is already linked to a user
        let user = await UserModel.findOne({
          oAuthProviders: {
            $elemMatch: { provider: "google", providerId: profile.id },
          },
        });

        if (user) {
          return done(null, user);
        }

        // 2. Check if a user with this email already exists (link accounts)
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email returned from Google profile"));
        }

        user = await UserModel.findOne({ email: email.toLowerCase().trim() });

        if (user) {
          user.oAuthProviders.push({ provider: "google", providerId: profile.id });
          await user.save();
          return done(null, user);
        }

        // 3. No existing user at all — create a new one
        const newUser = await UserModel.create({
          name: profile.displayName,
          email: email.toLowerCase().trim(),
          avatarUrl: profile.photos?.[0]?.value,
          oAuthProviders: [{ provider: "google", providerId: profile.id }],
        });

        return done(null, newUser);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

export default passport;