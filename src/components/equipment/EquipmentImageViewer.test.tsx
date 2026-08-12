import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EquipmentImageViewer } from './EquipmentImageViewer';

const image = {
  imageId: 'MOCK-IMG-001',
  thumbnailUrl: '/mock-equipment/test-console.svg',
  fullUrl: '/mock-equipment/test-console.svg',
  alt: 'A장비 목업 이미지',
  isPrimary: true,
};

describe('장비 이미지 뷰어', () => {
  it('키보드 포커스로 미리보기를 열고 클릭으로 확대 대화상자를 연다', async () => {
    render(<EquipmentImageViewer images={[image]} equipmentName="A장비" />);
    const trigger = screen.getByRole('button', { name: 'A장비 이미지 확대' });

    fireEvent.focus(trigger);
    expect(screen.getByText('선택하면 원본 크기로 확인할 수 있습니다.')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'A장비 이미지' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '이미지 확대 닫기' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'A장비 이미지' })).not.toBeInTheDocument();
    });
  });

  it('이미지가 없으면 대체 상태를 제공한다', () => {
    render(<EquipmentImageViewer images={[]} equipmentName="A장비" variant="panel" />);
    expect(screen.getByText('등록 이미지 없음')).toBeInTheDocument();
  });
});
