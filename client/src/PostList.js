import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import CommentCreate from "./CommentCreate";
import CommentList from "./CommentList";

const PostList = () => {
  const [posts, setPosts] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      console.log("Fetching posts from query service...");
      const res = await axios.get("http://localhost:6000/posts", {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      console.log("Received posts:", res.data);
      setPosts(res.data);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching posts:", err);
      if (err.response) {
        console.error("Error response data:", err.response.data);
        console.error("Error response status:", err.response.status);
        setError(`Failed to fetch posts: ${err.response.status} ${err.response.statusText}`);
      } else if (err.request) {
        console.error("No response received:", err.request);
        console.error("Request URL:", err.config.url);
        console.error("Request method:", err.config.method);
        console.error("Request headers:", err.config.headers);
        // Don't set error state if we're still in the initial loading phase
        if (!isLoading) {
          setError("Failed to fetch posts: No response from server. Please check if the query service is running.");
        }
      } else {
        console.error("Error setting up request:", err.message);
        setError(`Failed to fetch posts: ${err.message}`);
      }
    }
  }, [isLoading]);

  useEffect(() => {
    // Initial fetch
    fetchPosts();

    // Set up polling to refresh posts every 5 seconds
    const interval = setInterval(() => {
      fetchPosts();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchPosts]);

  const renderedPosts = Object.values(posts).map((post) => {
    return (
      <div
        className="card"
        style={{ width: "30%", marginBottom: "20px" }}
        key={post.id}
      >
        <div className="card-body">
          <h3>{post.title}</h3>
          <CommentList comments={post.comments} />
          <CommentCreate postId={post.id} />
        </div>
      </div>
    );
  });

  return (
    <div>
      {isLoading && <div className="alert alert-info">Loading posts...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex flex-row flex-wrap justify-content-between">
        {renderedPosts}
      </div>
    </div>
  );
};

export default PostList;
