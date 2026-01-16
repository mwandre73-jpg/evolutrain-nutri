import { withAuth } from "next-auth/middleware";

const authProxy = withAuth({
    pages: {
        signIn: "/api/auth/signin",
    },
});

export const proxy = authProxy;
export default authProxy;

export const config = {
    matcher: ["/dashboard/:path*"],
};
