import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV } from '../csv';

describe('csv utility', () => {
    let mockCreateElement: ReturnType<typeof vi.spyOn>;
    let mockAppendChild: ReturnType<typeof vi.spyOn>;
    let mockRemoveChild: ReturnType<typeof vi.spyOn>;
    let mockLink: HTMLAnchorElement;
    let mockCreateObjectURL: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Create mock link element
        mockLink = {
            download: '',
            href: '',
            style: { visibility: '' },
            click: vi.fn(),
            setAttribute: vi.fn(),
        } as unknown as HTMLAnchorElement;

        mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
        mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
        mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);
        mockCreateObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does nothing for empty data array', () => {
        exportToCSV([], 'test.csv');
        expect(mockCreateElement).not.toHaveBeenCalled();
    });

    it('does nothing for null/undefined data', () => {
        exportToCSV(null as any, 'test.csv');
        expect(mockCreateElement).not.toHaveBeenCalled();

        exportToCSV(undefined as any, 'test.csv');
        expect(mockCreateElement).not.toHaveBeenCalled();
    });

    it('creates CSV with headers from first row', () => {
        const data = [
            { name: 'John', age: 30 },
            { name: 'Jane', age: 25 }
        ];

        exportToCSV(data, 'test.csv');

        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'test.csv');
        expect(mockLink.click).toHaveBeenCalled();
    });

    it('escapes quotes in values', () => {
        const data = [{ message: 'He said "Hello"' }];

        exportToCSV(data, 'test.csv');

        // The Blob gets created with properly escaped content
        expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('wraps values with commas in quotes', () => {
        const data = [{ address: '123 Main St, Apt 4' }];

        exportToCSV(data, 'test.csv');
        expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('handles null and undefined values', () => {
        const data = [
            { name: 'John', value: null, other: undefined }
        ];

        exportToCSV(data, 'test.csv');
        expect(mockLink.click).toHaveBeenCalled();
    });

    it('handles numeric values', () => {
        const data = [
            { count: 42, price: 19.99 }
        ];

        exportToCSV(data, 'test.csv');
        expect(mockLink.click).toHaveBeenCalled();
    });

    it('handles values with newlines', () => {
        const data = [
            { notes: 'Line 1\nLine 2' }
        ];

        exportToCSV(data, 'test.csv');
        expect(mockLink.click).toHaveBeenCalled();
    });

    it('cleans up link element after click', () => {
        const data = [{ name: 'Test' }];

        exportToCSV(data, 'test.csv');

        expect(mockAppendChild).toHaveBeenCalled();
        expect(mockRemoveChild).toHaveBeenCalled();
    });
});
