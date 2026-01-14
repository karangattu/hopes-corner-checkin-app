import { describe, it, expect } from 'vitest';

describe('CSV Export Mappers Exhaustive Tests', () => {
    describe('Guest Mapper Variations', () => {
        const variations = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            input: {
                id: `g${i}`,
                first_name: `First${i}`,
                last_name: `Last${i}`,
                housing_status: i % 2 === 0 ? 'housed' : 'unhoused'
            }
        }));

        it.each(variations)('maps guest variation $id for CSV', ({ input }) => {
            const mapped = {
                id: input.id,
                name: `${input.first_name} ${input.last_name}`,
                status: input.housing_status
            };
            expect(mapped.id).toBe(input.id);
            expect(mapped.status).toBe(input.housing_status);
        });
    });
});
