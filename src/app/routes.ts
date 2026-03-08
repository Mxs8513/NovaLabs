import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./components/Home";
import { Results } from "./components/Results";
import { Schedule } from "./components/Schedule";
import { CampusMap } from "./components/CampusMap";
import { ProfessorPick } from "./components/ProfessorPick";
import { WhoDoIAsk } from "./components/WhoDoIAsk";
import { Login } from "./components/Login";
import { Profile } from "./components/Profile";
import { DegreePlanner } from "./components/DegreePlanner";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "results", Component: Results },
      { path: "schedule", Component: Schedule },
      { path: "map", Component: CampusMap },
      { path: "professor-pick", Component: ProfessorPick },
      { path: "who-do-i-ask", Component: WhoDoIAsk },
      { path: "degree-planner", Component: DegreePlanner },
      { path: "profile", Component: Profile },
    ],
  },
]);
