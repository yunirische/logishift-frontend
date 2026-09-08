import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "../ui";

it("blocks clicks while loading and respects explicit disabled state afterwards", () => {
  const onClick = vi.fn();
  const { rerender } = render(<Button isLoading onClick={onClick}>Save</Button>);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toBeDisabled();
  expect(onClick).not.toHaveBeenCalled();

  rerender(<Button disabled onClick={onClick}>Save</Button>);
  expect(screen.getByRole("button")).toBeDisabled();

  rerender(<Button onClick={onClick}>Save</Button>);
  fireEvent.click(screen.getByRole("button"));
  expect(onClick).toHaveBeenCalledTimes(1);
});
