export type SupportedLocale = 'ja' | 'en';

export function getLocaleTag(locale: SupportedLocale): string {
    return locale === 'en' ? 'en-US' : 'ja-JP';
}

function getHistoryDateFormatOptions(locale: SupportedLocale): Intl.DateTimeFormatOptions {
    return locale === 'en'
        ? {
            dateStyle: 'medium',
            timeStyle: 'short',
            hour12: true,
        }
        : {
            dateStyle: 'medium',
            timeStyle: 'short',
            hour12: false,
        };
}

export function formatDisplayNumber(value: number, locale: SupportedLocale): string {
    return new Intl.NumberFormat(getLocaleTag(locale)).format(value);
}

export function formatHistoryDate(completedAt: number, locale: SupportedLocale): string {
    return new Intl.DateTimeFormat(getLocaleTag(locale), getHistoryDateFormatOptions(locale))
        .format(new Date(completedAt));
}
