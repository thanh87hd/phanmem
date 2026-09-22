import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderWithRouter = (allowedRoles: string[], initialEntry = '/protected') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<div>Trang Đăng nhập</div>} />
          <Route path="/" element={<div>Trang chủ</div>} />
          <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
            <Route path="/protected" element={<div>Nội dung được bảo vệ</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  };

  it('PR-01: redirects to /login when user is not logged in', () => {
    renderWithRouter(['Admin', 'kiểm toán viên']);
    expect(screen.getByText('Trang Đăng nhập')).toBeDefined();
    expect(screen.queryByText('Nội dung được bảo vệ')).toBeNull();
  });

  it('PR-02: redirects to /login when localStorage user data is corrupt JSON', () => {
    localStorage.setItem('user', 'invalid-json{{{');
    renderWithRouter(['Admin']);
    expect(screen.getByText('Trang Đăng nhập')).toBeDefined();
  });

  it('PR-03: allows Admin access unconditionally regardless of allowedRoles', () => {
    localStorage.setItem('user', JSON.stringify({ username: 'admin', role: 'System Admin' }));
    renderWithRouter(['SpecificRoleOnly']);
    expect(screen.getByText('Nội dung được bảo vệ')).toBeDefined();
  });

  it('PR-04: allows access when user role directly matches allowedRoles', () => {
    localStorage.setItem('user', JSON.stringify({ username: 'user1', role: 'Auditor' }));
    renderWithRouter(['Auditor']);
    expect(screen.getByText('Nội dung được bảo vệ')).toBeDefined();
  });

  it('PR-05: allows hierarchical role access for BKS group', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ username: 'bks_leader', role: 'trưởng ban kiểm soát' }),
    );
    renderWithRouter(['ban kiểm soát']);
    expect(screen.getByText('Nội dung được bảo vệ')).toBeDefined();
  });

  it('PR-06: allows hierarchical role access for Đoàn kiểm toán / KTV', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ username: 'lead', role: 'trưởng đoàn kiểm toán' }),
    );
    renderWithRouter(['kiểm toán viên']);
    expect(screen.getByText('Nội dung được bảo vệ')).toBeDefined();
  });

  it('PR-07: renders 403 Forbidden when user does not have permission', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ username: 'guest', role: 'Khách mời' }),
    );
    renderWithRouter(['trưởng ban ktnb', 'admin']);
    expect(screen.getByText('403 Forbidden')).toBeDefined();
    expect(screen.queryByText('Nội dung được bảo vệ')).toBeNull();
  });
});
