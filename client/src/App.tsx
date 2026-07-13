import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import InsightWrite from "./pages/InsightWrite";
import InsightsFeed from "./pages/InsightsFeed";
import DashboardLayout from "./components/DashboardLayout";
import ImprovementCreate from "./pages/ImprovementCreate";
import ImprovementsLibrary from "./pages/ImprovementsLibrary";
import CardUiReview from "./pages/CardUiReview";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/insights/new"} component={InsightWrite} />
        <Route path={"/insights"} component={InsightsFeed} />
        <Route path={"/improvements/new"} component={ImprovementCreate} />
        <Route path={"/improvements"} component={ImprovementsLibrary} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          {import.meta.env.DEV && window.location.pathname === "/__ui-review" ? <CardUiReview /> : <Router />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
