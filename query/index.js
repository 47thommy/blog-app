const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://client:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true
}));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request headers:', req.headers);
  next();
});

const posts = {};

const handleEvent = (type, data) => {
  try {
    if (type === "PostCreated") {
      const { id, title } = data;
      console.log("Processing PostCreated event:", { id, title });
      posts[id] = { id, title, comments: [] };
    }

    if (type === "CommentCreated") {
      const { id, content, postId, status } = data;
      console.log("Processing CommentCreated event:", { id, content, postId, status });
      const post = posts[postId];
      if (!post) {
        console.error(`Post ${postId} not found for comment ${id}`);
        return;
      }
      post.comments.push({ id, content, status });
    }

    if (type === "CommentUpdated") {
      const { id, content, postId, status } = data;
      console.log("Processing CommentUpdated event:", { id, content, postId, status });
      const post = posts[postId];
      if (!post) {
        console.error(`Post ${postId} not found for comment update ${id}`);
        return;
      }
      const comment = post.comments.find((comment) => {
        return comment.id === id;
      });

      if (!comment) {
        console.error(`Comment ${id} not found in post ${postId}`);
        return;
      }

      comment.status = status;
      comment.content = content;
    }
  } catch (error) {
    console.error("Error handling event:", error);
  }
};

app.get("/posts", (req, res) => {
  try {
    console.log("Sending posts:", posts);
    res.send(posts);
  } catch (error) {
    console.error("Error sending posts:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

app.post("/events", (req, res) => {
  try {
    const { type, data } = req.body;
    console.log("Received event:", type);
    handleEvent(type, data);
    res.send({});
  } catch (error) {
    console.error("Error processing event:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send({ error: "Internal server error" });
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchEvents = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to fetch events from event bus (attempt ${i + 1}/${retries})...`);
      const res = await axios.get("http://event-bus:4005/events");
      console.log("Successfully fetched events from event bus:", res.data);
      return res.data;
    } catch (error) {
      console.error(`Failed to fetch events (attempt ${i + 1}/${retries}):`, error.message);
      if (i < retries - 1) {
        console.log(`Waiting ${delay/1000} seconds before retrying...`);
        await sleep(delay);
      }
    }
  }
  console.log("Failed to fetch events after all retries. Starting with empty state.");
  return [];
};

const startServer = async () => {
  try {
    // Start the server with IPv4 binding
    const server = app.listen(4002, '0.0.0.0', () => {
      console.log("Query service listening on port 4002");
      console.log("Server address:", server.address());
    });

    // Fetch events from event bus with retries
    const events = await fetchEvents();
    
    for (let event of events) {
      console.log("Processing event:", event.type);
      handleEvent(event.type, event.data);
    }
  } catch (error) {
    console.error("Error starting server:", error.message);
    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
    }
    process.exit(1);
  }
};

startServer();
