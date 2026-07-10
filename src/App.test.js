import { render, screen } from '@testing-library/react';
import App from './App';

// Smoke test: the whole app mounts and shows the landing surface (search +
// "Surprise me"), i.e. no module in the import graph crashes on render.
test('renders the landing surface', async () => {
  render(<App />);
  expect(
    await screen.findByRole('button', { name: /surprise me/i })
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText(/search ingredients, cuisines, and dish types/i)
  ).toBeInTheDocument();
});
