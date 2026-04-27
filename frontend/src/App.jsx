import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import Navbar from "./components/Navbar";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Files from "./components/Files";
import Upload from "./components/Upload";
import Calculate from "./components/Calculator";
import "@mui/material/styles";
import FeedbackFiles from "./components/FeedbackFiles";

function App() {

  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <>
          <Navbar />
          <Upload />
        </>
      ),
    },
    {
      path: "/files",
      element: (
        <>
          <Navbar />
          <Files />
        </>
      ),
    },
    {
      path: "/calculate",
      element: (
        <>
          <Navbar />
          <Calculate />
        </>
      ),
    },
    {
      path: "/feedback-files",
      element: (
        <>
          <Navbar />
          <FeedbackFiles />
        </>
      ),
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
