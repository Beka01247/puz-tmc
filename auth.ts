import NextAuth, { User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db/drizzle";
import { users } from "./db/schema";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email.toString()));

        if (user.length === 0) {
          return null;
        }

        const isValidPassword = await compare(
          credentials.password.toString(),
          user[0].password
        );

        if (!isValidPassword) {
          return null;
        }

        // Reconstruct the frontend userType from database userType and doctorType
        let frontendUserType: string = user[0].userType || "PATIENT";
        if (user[0].userType === "DOCTOR") {
          if (user[0].doctorType === "GENERAL") {
            frontendUserType = "DISTRICT_DOCTOR";
          } else if (user[0].doctorType === "SPECIALIST") {
            frontendUserType = "SPECIALIST_DOCTOR";
          }
        }

        return {
          id: user[0].id,
          email: user[0].email,
          fullName: user[0].fullName,
          userType: frontendUserType,
          organization: user[0].organization,
          city: user[0].city,
          subdivision: user[0].subdivision,
          district: user[0].district,
          department: user[0].department,
          specialization: user[0].specialization,
          avatar: user[0].avatar,
          iin: user[0].iin,
          telephone: user[0].telephone,
        } as User;
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.fullName = user.fullName;
        token.userType = user.userType;
        token.organization = user.organization;
        token.city = user.city;
        token.subdivision = user.subdivision;
        token.district = user.district;
        token.department = user.department;
        token.specialization = user.specialization;
        token.avatar = user.avatar;
        token.iin = user.iin;
        token.telephone = user.telephone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.fullName = token.fullName as string;
        session.user.avatar = token.avatar as string;
        session.user.userType = token.userType as string;
        session.user.organization = token.organization as string;
        session.user.city = token.city as string;
        session.user.subdivision = token.subdivision as string;
        session.user.district = token.district as string;
        session.user.department = token.department as string;
        session.user.specialization = token.specialization as string;
        session.user.iin = token.iin as string;
        session.user.telephone = token.telephone as string;
      }
      return session;
    },
  },
});
