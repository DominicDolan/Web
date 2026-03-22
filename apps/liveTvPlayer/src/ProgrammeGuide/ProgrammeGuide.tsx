import {createMemo, createSignal, For, Loading, Repeat, Show} from "solid-js";
import {queries} from "../api/queries";
import dayjs from "dayjs";
import {ProgrammeCard} from "./ProgrammeCard";

export const HOUR_WIDTH = 300;

export function ProgrammeGuide() {

    const HOUR_WIDTH = 300; // pixels per hour
    const HOURS_TO_SHOW = 24;
    const startHour = dayjs().subtract(12, "hours");

    const channelsList = createMemo(() => queries.channels.list().then(r => r?.entries ?? []))

    const epgList = createMemo(() => queries.epg.events().then(r => r?.entries ?? []))

    function programByChannel(channelId: string) {
        return epgList().filter(p => p.channelUuid === channelId);
    }

    const [sidebarList, setSidebarList] = createSignal<HTMLDivElement>()

    function onScroll(e: any) {
        const sidebar = sidebarList()
        if (sidebar != null) {
            sidebar.scrollTop = e.target.scrollTop
        }
    }

    return <>
        <Loading fallback={<div>Loading...</div>}>
            <aside class="w-full h-full flex flex-col">
                <div class="row h-16 flex items-center justify-center">
                    <h2>Channels</h2>
                </div>
                <div class="flex-1 overflow-y-auto" ref={setSidebarList}>
                    <div>
                        <hr/>
                        <For each={channelsList()}>{(channel) => (<>
                            <div class="row h-24 flex flex-col gap-2 items-center justify-center px-2">
                                <div><i class={`fa-solid fa-earth-europe`}></i></div>
                                <div>{channel().val}</div>
                            </div>
                            <hr/>
                        </>)}</For>
                    </div>

                </div>
            </aside>

            <main class="w-full h-full flex flex-col">
                <div class="row flex gap-2 h-16">
                    <Repeat count={HOURS_TO_SHOW}>{(i) => {
                        const currentHour = startHour.clone().add(i, "hour");
                        return <>
                            <div style={`min-width: ${HOUR_WIDTH/2}px`}>{currentHour.format("HH:mm")}</div>
                            <div style={`min-width: ${HOUR_WIDTH/2}px`}>{currentHour.add(30, "minute").format("HH:mm")}</div>
                        </>
                    }}</Repeat>
                </div>

                <div class={"flex-1 overflow-y-auto relative"} onScroll={onScroll} >
                    <div>
                        <For each={channelsList()}>{(channel) => (<>
                                <div class="row h-24 flex gap-2 relative">
                                    <For each={programByChannel(channel().key)}>{(program) => (<>
                                        <ProgrammeCard event={program()} startHour={startHour} />
                                    </>)}</For>
                                </div>
                            <hr/>
                            </>)}
                        </For>
                    </div>
                </div>
            </main>
        </Loading>
</>
}
