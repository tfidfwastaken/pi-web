import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../App";

describe("App", () => {
  it("renders the connect dialog when not connected", () => {
    render(<App />);
    expect(screen.getByText(/Connect to Pi Agent/i)).toBeInTheDocument();
  });

  it("has a working directory input", () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/path\/to\/your\/project/i)).toBeInTheDocument();
  });
});
