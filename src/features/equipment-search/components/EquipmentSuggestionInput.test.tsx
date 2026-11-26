import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { EquipmentSuggestionInput } from './EquipmentSuggestionInput';

const { suggest } = vi.hoisted(() => ({ suggest: vi.fn() }));
vi.mock('../../../services', () => ({ equipmentService: { suggest } }));

afterEach(() => {
  cleanup();
  suggest.mockReset();
});

function SearchInput({ onSubmit }: { onSubmit: (value: string) => void }) {
  const [value, setValue] = useState('');
  return <EquipmentSuggestionInput field="query" label="장비 검색" value={value} onChange={setValue} onSubmit={onSubmit} />;
}

it('입력 중 일치 옵션을 보여주고 클릭했을 때만 선택한 값으로 검색한다', async () => {
  suggest.mockResolvedValueOnce(['TEST-001', 'TEST-002']);
  const onSubmit = vi.fn();
  render(<SearchInput onSubmit={onSubmit} />);
  const input = screen.getByRole('combobox', { name: '장비 검색' });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'TEST' } });
  const option = await screen.findByRole('option', { name: 'TEST-002' });
  expect(suggest).toHaveBeenCalledWith('query', 'TEST', expect.any(AbortSignal));
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.click(option);
  expect(input).toHaveValue('TEST-002');
  expect(onSubmit).toHaveBeenCalledWith('TEST-002');
});

it('제안에 없는 검색어도 Enter로 검색한다', () => {
  const onSubmit = vi.fn();
  render(<SearchInput onSubmit={onSubmit} />);
  const input = screen.getByRole('combobox', { name: '장비 검색' });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '임의 입력' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onSubmit).toHaveBeenCalledWith('임의 입력');
});
