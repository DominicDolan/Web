import {ProgrammeGuide} from "./ProgrammeGuide/ProgrammeGuide";
import {PageNav} from "./PageNav/PageNav";

export default function App() {
  return (
    <main class={"lumina dark grid grid-cols-[140px_calc(100%-140px)] grid-rows-[60px_calc(100%-60px)] h-screen w-screen"}>
      <PageNav />
      <ProgrammeGuide />
    </main>
  );
}
