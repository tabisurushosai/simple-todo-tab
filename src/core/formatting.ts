export type SupportedLocale = 'ja' | 'en';

export function getLocaleTag(locale: SupportedLocale): string {
    return locale === 'en' ? 'en-US' : 'ja-JP';
}

function getHistoryDateFormatOptions(locale: SupportedLocale): Intl.DateTimeFormatOptions {
    return locale === 'en'
        ? {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }
        : {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        };
}

export function formatDisplayNumber(value: number, locale: SupportedLocale): string {
    return new Intl.NumberFormat(getLocaleTag(locale)).format(value);
}

export function formatHistoryDate(completedAt: number, locale: SupportedLocale): string {
    return new Intl.DateTimeFormat(getLocaleTag(locale), getHistoryDateFormatOptions(locale))
        .format(new Date(completedAt));
}
