export function escapeMarkdown(text: string): string {
    // if (!text) return '';
    // return text.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
    return text;
}

export function toSolarDate(date: number): number {
    return date - 621;
}

export function middleYear(startDate: number, endDate: number): number {
    return Math.floor((startDate + endDate)/2);
}

export function toShahanshahiDate(date: number): number {
    return date + 559;
}

export function toPersianNumber(date: number): string {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const standardDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    const str = String(date);
    let result = str;
    for (let i = 0; i < standardDigits.length; i++) {
        const regex = new RegExp(standardDigits[i], 'g');
        result = result.replace(regex, persianDigits[i]);
    }
    return result
}

export function generateDatePart(startDate: number, endDate: number): string {
    const year = middleYear(startDate, endDate);
    return `<i>${toPersianNumber(toSolarDate(year))} شمسی، مصادف با: ${toPersianNumber(toShahanshahiDate(year))} شاهنشاهی</i>`;
}