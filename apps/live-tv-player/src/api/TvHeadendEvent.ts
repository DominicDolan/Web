
interface TvHeadendEvent {
    eventId: number;
    channelName: string;
    channelUuid: string;
    /** Note: string type in this payload */
    channelNumber: string;
    channelIcon: string;
    /** Unix Timestamp (seconds) */
    start: number;
    /** Unix Timestamp (seconds) */
    stop: number;
    title: string;
    description: string;
    nextEventId: number;
    /** Optional flags often returned as 1 (true) or missing */
    widescreen?: 0 | 1;
    subtitled?: 0 | 1;
}
