import {test, expect} from 'vitest';
import {add, subtract} from 'math';

test('we can add and subtract numbers', () => {
    expect(subtract(2, 1)).toBe(1)
    expect(add(1, 2)).toBe(3)
})
