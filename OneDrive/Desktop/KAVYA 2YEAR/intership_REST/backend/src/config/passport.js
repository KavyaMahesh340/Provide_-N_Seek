const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User, Organization } = require('../models');
const { v4: uuidv4 } = require('uuid');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({
          where: { oauth_provider: 'google', oauth_id: profile.id },
        });

        if (user) {
          return done(null, user);
        }

        // Check if email already registered
        const email = profile.emails[0].value;
        user = await User.findOne({ where: { email } });

        if (user) {
          // Link Google account
          user.oauth_provider = 'google';
          user.oauth_id = profile.id;
          await user.save();
          return done(null, user);
        }

        // Create new org and user
        const orgName = `${profile.displayName}'s Workspace`;
        const org = await Organization.create({
          name: orgName,
          slug: `${profile.displayName.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().slice(0, 6)}`,
        });

        user = await User.create({
          name: profile.displayName,
          email,
          organization_id: org.id,
          role: 'admin',
          oauth_provider: 'google',
          oauth_id: profile.id,
          avatar: profile.photos[0]?.value || null,
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
