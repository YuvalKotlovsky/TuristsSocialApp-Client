import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

const ext = path.extname(__filename);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Travel App API", version: "1.0.0" },
    servers: [{ url: "http://localhost:5001/api" }],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            fullName: { type: "string" },
            email: { type: "string", format: "email" },
            avatar: { type: "string", nullable: true },
            provider: { type: "string", enum: ["local", "google"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Post: {
          type: "object",
          properties: {
            _id: { type: "string" },
            content: { type: "string" },
            image: { type: "string", nullable: true },
            location: { type: "string", nullable: true },
            createdBy: { $ref: "#/components/schemas/User" },
            likes: { type: "array", items: { type: "string" } },
            likesCount: { type: "integer" },
            isLikedByMe: { type: "boolean" },
            commentsCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Comment: {
          type: "object",
          properties: {
            _id: { type: "string" },
            postId: { type: "string" },
            content: { type: "string" },
            createdBy: { $ref: "#/components/schemas/User" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            user: { $ref: "#/components/schemas/User" },
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
          },
        },
        PaginatedPosts: {
          type: "object",
          properties: {
            posts: { type: "array", items: { $ref: "#/components/schemas/Post" } },
            total: { type: "integer" },
            page: { type: "integer" },
            totalPages: { type: "integer" },
            hasMore: { type: "boolean" },
          },
        },
        Error: {
          type: "object",
          properties: { message: { type: "string" } },
        },
      },
    },
  },
  apis: [path.join(__dirname, `routes/*${ext}`)],
};

export const swaggerSpec = swaggerJsdoc(options);
