"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCareSnapshot = getCareSnapshot;
exports.getDurationMinutes = getDurationMinutes;
function isLater(left, right) {
    return Date.parse(left.occurredAt) > Date.parse(right.occurredAt);
}
function latest(events) {
    return events.reduce((current, event) => (!current || isLater(event, current) ? event : current), undefined);
}
function getCareSnapshot(events) {
    const sleepEvents = events.filter((event) => event.type === 'sleep');
    return {
        latestDiaper: latest(events.filter((event) => event.type === 'diaper')),
        latestFeeding: latest(events.filter((event) => event.type === 'feeding')),
        latestMeasurement: latest(events.filter((event) => event.type === 'measurement')),
        latestFinishedSleep: latest(sleepEvents.filter((event) => Boolean(event.endedAt))),
        openSleep: latest(sleepEvents.filter((event) => !event.endedAt)),
    };
}
function getDurationMinutes(start, end) {
    return Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60_000));
}
