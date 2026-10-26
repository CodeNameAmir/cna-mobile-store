import React, { useState, useMemo } from 'react';
import { useAdminData, getRoleLabelFa } from '../../context/AdminDataContext';
import { AdminUser, UserRole, UserStatus } from '../../types/admin';
import { formatToman, toPersianDigits } from '../../utils/formatters';

export const AdminUsersPage: React.FC = () => {
  const { users, addUser, updateUserStatus, updateUserRole, updateUserAdminNote, showToast } =
    useAdminData();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected users for bulk messaging
  const [selectedIds, setSelectedIds] = useState<string[]>(['usr-1', 'usr-4']);

  // Drawer state for Customer Slide-Over
  const [drawerUser, setDrawerUser] = useState<AdminUser | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');

  // Create New User Modal
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('customer');
  const [newUserError, setNewUserError] = useState('');

  // Role Change Modal
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null);
  const [selectedRoleToUpdate, setSelectedRoleToUpdate] = useState<UserRole>('customer');

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = user.fullName.toLowerCase().includes(q);
        const matchEmail = user.email.toLowerCase().includes(q);
        const matchPhone = user.phone.includes(q);
        const matchNationalId = user.nationalId.includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchNationalId) return false;
      }

      if (roleFilter !== 'all') {
        if (roleFilter === 'vip' && user.role !== 'vip') return false;
        if (roleFilter === 'customer' && user.role !== 'customer') return false;
        if (roleFilter === 'super_admin' && user.role !== 'super_admin') return false;
        if (roleFilter === 'warehouse_manager' && user.role !== 'warehouse_manager') return false;
      }

      if (statusFilter !== 'all') {
        if (user.status !== statusFilter) return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredUsers.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenDrawer = (user: AdminUser) => {
    setDrawerUser(user);
    setAdminNoteInput(user.adminNote || '');
  };

  const handleSaveAdminNote = () => {
    if (drawerUser) {
      updateUserAdminNote(drawerUser.id, adminNoteInput);
      setDrawerUser((prev) => (prev ? { ...prev, adminNote: adminNoteInput } : null));
    }
  };

  const handleToggleSuspend = (user: AdminUser) => {
    if (user.role === 'super_admin') {
      showToast('خطای امنیتی: حساب ادمین ارشد کل سیستم غیرقابل مسدودسازی است!');
      return;
    }
    const nextStatus: UserStatus = user.status === 'suspended' ? 'active' : 'suspended';
    updateUserStatus(user.id, nextStatus);
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserError('');

    if (!newName.trim() || !newPhone.trim() || !newEmail.trim()) {
      setNewUserError('لطفاً تمامی فیلدهای الزامی را تکمیل فرمایید.');
      return;
    }

    addUser({
      fullName: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim(),
      role: newRole
    });

    setIsNewUserModalOpen(false);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewRole('customer');
  };

  const handleRoleChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModalUser) return;
    updateUserRole(roleModalUser.id, selectedRoleToUpdate);
    setRoleModalUser(null);
  };

  const handleSendBroadcastSms = () => {
    if (selectedIds.length === 0) {
      showToast('هیچ کاربری انتخاب نشده است.');
      return;
    }
    showToast(`پیامک اطلاع‌رسانی به ${toPersianDigits(selectedIds.length)} کاربر ارسال گردید.`);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Header & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm font-bold">
              CNA
            </span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              مدیریت مشتریان و سطوح دسترسی کاربران
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            بررسی باشگاه مشتریان وفادار، تغییر دسترسی‌های کارکنان و پایش تراکنش‌های فعال فروشگاه سی‌ان‌ای
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              showToast('مدیریت سطوح دسترسی: ۵ نقش استاندارد در سیستم فعال می‌باشند.');
            }}
            className="h-11 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface flex items-center gap-2 font-label-lg text-label-lg shadow-sm transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-primary">
              admin_panel_settings
            </span>
            <span>تعریف نقش کاربری</span>
          </button>
          <button
            onClick={() => setIsNewUserModalOpen(true)}
            className="h-11 px-5 rounded-xl bg-primary hover:bg-primary-container text-on-primary flex items-center gap-2 font-label-lg text-label-lg shadow-md transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span>افزودن کاربر جدید</span>
          </button>
        </div>
      </div>

      {/* KPI Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total members */}
        <div className="relative overflow-hidden bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                کل کاربران عضو
              </span>
              <span className="font-headline-xl text-headline-xl text-on-surface">
                {toPersianDigits('۵,۴۲۰')}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant">نفر</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[26px]">groups</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              ۱۲.۴٪+
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              نسبت به ماه گذشته
            </span>
          </div>
        </div>

        {/* Stat 2: VIP Club */}
        <div className="relative overflow-hidden bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="font-label-md text-label-md text-tertiary">
                  خریداران وفادار (باشگاه VIP)
                </span>
                <span className="material-symbols-outlined text-tertiary text-[16px]">stars</span>
              </div>
              <span className="font-headline-xl text-headline-xl text-on-surface">
                {toPersianDigits(850)}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant">نفر</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[26px]">workspace_premium</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-tertiary bg-tertiary-fixed px-2 py-0.5 rounded-full">
                ۱۵.۶٪ سهم کل
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              میانگین خرید ۶۸ م.ت
            </span>
          </div>
        </div>

        {/* Stat 3: Admins */}
        <div className="relative overflow-hidden bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                مدیران و ادمین‌های سیستم
              </span>
              <span className="font-headline-xl text-headline-xl text-on-surface">
                {toPersianDigits(4)}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant">نفر</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[26px]">security</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              تمام حساب‌ها با تایید دومرحله‌ای فعال
            </span>
          </div>
        </div>

        {/* Stat 4: Today New */}
        <div className="relative overflow-hidden bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">
                کاربران جدید امروز
              </span>
              <span className="font-headline-xl text-headline-xl text-on-surface">
                {toPersianDigits(32)}{' '}
                <span className="font-label-md text-label-md text-on-surface-variant">نفر</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[26px]">how_to_reg</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[14px]">speed</span>
              +۶ نفر
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              بیشتر از دیروز تا این ساعت
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              person_search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام، ایمیل، شماره موبایل یا کدملی..."
              className="w-full h-11 pr-11 pl-4 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          {/* Level Filter */}
          <div className="relative min-w-[180px]">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full h-11 px-4 pr-10 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="all">همه سطوح کاربری</option>
              <option value="customer">مشتری عادی</option>
              <option value="vip">مشتری طلایی / VIP</option>
              <option value="warehouse_manager">مدیر انبار</option>
              <option value="super_admin">ادمین کل سیستم</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">
              tune
            </span>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 px-4 pr-10 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="all">وضعیت: همه</option>
              <option value="active">فعال</option>
              <option value="suspended">مسدود شده</option>
              <option value="unverified">تایید نشده</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">
              verified_user
            </span>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        {/* Quick Tool Buttons */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          <button
            onClick={() => {
              const csv =
                'data:text/csv;charset=utf-8,\uFEFF' +
                ['Name', 'NationalId', 'Phone', 'Email', 'Role', 'Purchases'].join(',') +
                '\n' +
                users
                  .map((u) => [u.fullName, u.nationalId, u.phone, u.email, u.role, u.totalPurchases].join(','))
                  .join('\n');
              const link = document.createElement('a');
              link.setAttribute('href', encodeURI(csv));
              link.setAttribute('download', 'CNA_Users.csv');
              link.click();
              showToast('خروجی اکسل کاربران دانلود شد.');
            }}
            className="h-11 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-1.5 font-label-md text-label-md transition-colors"
            title="خروجی اکسل"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-600">
              file_download
            </span>
            <span>خروجی اکسل</span>
          </button>
          <button
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('all');
              setStatusFilter('all');
              showToast('فیلترهای کاربران بازنشانی شدند.');
            }}
            className="h-11 w-11 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
            title="بازنشانی فیلترها"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </div>

      {/* User Management Table Container */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Active filters bar */}
        <div className="px-6 py-3 bg-surface-container-low/60 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>
              نمایش {toPersianDigits(filteredUsers.length)} از مجموع {toPersianDigits(5420)} کاربر
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
            <span className="text-primary font-bold">
              {toPersianDigits(selectedIds.length)} کاربر انتخاب شده‌اند
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSendBroadcastSms}
              className="text-on-surface hover:text-primary flex items-center gap-1 font-label-sm text-label-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">sms</span>
              ارسال پیامک همگانی به انتخاب‌شده‌ها
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-md text-label-md text-on-surface-variant select-none">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredUsers.length > 0 && selectedIds.length === filteredUsers.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4 min-w-[200px]">کاربر و اطلاعات</th>
                <th className="py-4 px-4 min-w-[170px]">تماس و ارتباط</th>
                <th className="py-4 px-4 min-w-[160px]">نقش سازمانی / مشتری</th>
                <th className="py-4 px-4 min-w-[200px]">سفارش‌ها و مجموع خرید</th>
                <th className="py-4 px-4 min-w-[140px]">عضویت و آخرین ورود</th>
                <th className="py-4 px-4 text-center min-w-[110px]">وضعیت اکانت</th>
                <th className="py-4 px-6 text-center min-w-[160px]">عملیات مدیریت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low font-body-sm text-body-sm text-on-surface">
              {filteredUsers.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                const isSuperAdmin = user.role === 'super_admin';
                const isSuspended = user.status === 'suspended';

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-surface-container-low/40 transition-colors group ${
                      isSuspended ? 'bg-error-container/20' : ''
                    }`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(user.id)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-surface-container">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-secondary-fixed text-secondary font-headline-sm font-bold">
                              {user.fullName.slice(0, 2)}
                            </div>
                          )}
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-surface-container-lowest ${
                              user.role === 'vip'
                                ? 'bg-amber-500'
                                : user.role === 'super_admin'
                                ? 'bg-primary'
                                : 'bg-emerald-500'
                            }`}
                          ></span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-headline-sm text-headline-sm text-on-surface">
                              {user.fullName}
                            </span>
                            {user.role === 'vip' && (
                              <span
                                className="material-symbols-outlined text-tertiary text-[18px]"
                                title="باشگاه طلایی"
                              >
                                verified
                              </span>
                            )}
                            {user.role === 'super_admin' && (
                              <span
                                className="material-symbols-outlined text-primary text-[18px]"
                                title="ادمین ارشد"
                              >
                                verified_user
                              </span>
                            )}
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                            کدملی: {toPersianDigits(user.nationalId)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-0.5" dir="ltr">
                        <span className="font-label-md text-label-md text-right text-on-surface font-mono">
                          {toPersianDigits(user.phone)}
                        </span>
                        <span className="font-label-sm text-label-sm text-right text-on-surface-variant font-mono">
                          {user.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {user.role === 'vip' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md">
                          <span className="material-symbols-outlined text-[16px] text-tertiary">
                            stars
                          </span>
                          مشتری VIP طلایی
                        </span>
                      )}
                      {user.role === 'customer' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md">
                          <span className="material-symbols-outlined text-[16px] text-secondary">
                            person
                          </span>
                          مشتری عادی
                        </span>
                      )}
                      {user.role === 'super_admin' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-md text-label-md">
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            shield_person
                          </span>
                          ادمین ارشد سیستم
                        </span>
                      )}
                      {user.role === 'warehouse_manager' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-primary font-label-md text-label-md">
                          <span className="material-symbols-outlined text-[16px]">warehouse</span>
                          مدیر انبار
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-on-surface">
                          {toPersianDigits(
                            new Intl.NumberFormat('fa-IR').format(user.totalPurchases)
                          )}{' '}
                          <span className="font-price-unit text-price-unit text-on-surface-variant">
                            تومان
                          </span>
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {user.orderSummary}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface">
                          {user.joinedAt}
                        </span>
                        <span className="font-label-sm text-label-sm text-emerald-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {user.lastLogin}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {user.status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-label-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          فعال
                        </span>
                      )}
                      {user.status === 'suspended' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm">
                          <span className="w-2 h-2 rounded-full bg-error"></span>
                          مسدودشده موقت
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Profile Drawer Button */}
                        <button
                          onClick={() => handleOpenDrawer(user)}
                          className="p-2 rounded-lg hover:bg-surface-container text-primary transition-colors"
                          title="مشاهده پروفایل و جزئیات"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>

                        {/* Change Role Button */}
                        <button
                          onClick={() => {
                            setRoleModalUser(user);
                            setSelectedRoleToUpdate(user.role);
                          }}
                          className="p-2 rounded-lg hover:bg-surface-container text-secondary transition-colors"
                          title="تغییر سطح دسترسی"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            manage_accounts
                          </span>
                        </button>

                        {/* Send Notification Button */}
                        <button
                          onClick={() => {
                            showToast(`ارسال اعلان فوری به ${user.fullName} انجام شد.`);
                          }}
                          className="p-2 rounded-lg hover:bg-surface-container text-secondary transition-colors"
                          title="ارسال پیامک / اعلان"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            send_to_mobile
                          </span>
                        </button>

                        {/* SAFETY RULE: Super Admin block button is disabled with lock icon */}
                        {isSuperAdmin ? (
                          <button
                            disabled
                            className="p-2 rounded-lg opacity-40 cursor-not-allowed text-secondary"
                            title="حساب سیستمی غیرقابل مسدودسازی"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[20px]">lock</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleSuspend(user)}
                            className={`p-2 rounded-lg transition-colors ${
                              isSuspended
                                ? 'hover:bg-emerald-50 text-emerald-600'
                                : 'hover:bg-surface-container text-error'
                            }`}
                            title={isSuspended ? 'رفع مسدودیت حساب' : 'مسدودسازی موقت'}
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {isSuspended ? 'lock_open' : 'block'}
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="px-6 py-4 bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
            <span>تعداد سطر در هر صفحه:</span>
            <span className="px-2 py-1 rounded bg-surface-container-low text-on-surface">
              {toPersianDigits(filteredUsers.length)}
            </span>
            <span>از {toPersianDigits(5420)} ردیف</span>
          </div>
          <div className="flex items-center gap-1" dir="rtl">
            <button className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
            <button className="w-8 h-8 rounded-lg bg-primary text-on-primary font-label-md flex items-center justify-center">
              ۱
            </button>
            <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface font-label-md flex items-center justify-center">
              ۲
            </button>
            <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface font-label-md flex items-center justify-center">
              ۳
            </button>
            <span className="px-1 text-on-surface-variant">...</span>
            <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface font-label-md flex items-center justify-center">
              ۲۱۷
            </button>
            <button className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
          </div>
        </div>
      </div>

      {/* React Slide-Over Customer Drawer */}
      {drawerUser && (
        <div className="fixed inset-0 z-50 transition-all duration-300 flex">
          {/* Backdrop */}
          <div
            onClick={() => setDrawerUser(null)}
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm transition-opacity"
          />

          {/* Sliding Sheet (anchored left in RTL, consistent with code3.html) */}
          <div className="relative me-auto w-full max-w-xl bg-surface-container-lowest shadow-2xl flex flex-col h-full z-10 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-6 bg-surface-container-low flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined text-[24px]">account_circle</span>
                </div>
                <div className="flex flex-col">
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    {drawerUser.fullName}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm text-tertiary">
                      {getRoleLabelFa(drawerUser.role)}
                    </span>
                    <span className="text-on-surface-variant text-[10px]">•</span>
                    <span
                      className="font-label-sm text-label-sm text-on-surface-variant font-mono"
                      dir="ltr"
                    >
                      {toPersianDigits(drawerUser.phone)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDrawerUser(null)}
                className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6 flex-1">
              {/* Wallet & Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      account_balance_wallet
                    </span>
                    <span>موجودی کیف پول</span>
                  </div>
                  <span className="font-price-display text-price-display text-on-surface">
                    {formatToman(drawerUser.walletBalance)}
                  </span>
                  <span className="font-label-sm text-label-sm text-emerald-600">
                    آماده استفاده در سبد خرید
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-tertiary text-[18px]">
                      shopping_basket
                    </span>
                    <span>کل مبالغ پرداختی</span>
                  </div>
                  <span className="font-price-display text-price-display text-on-surface">
                    {formatToman(drawerUser.totalPurchases)}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {drawerUser.orderSummary}
                  </span>
                </div>
              </div>

              {/* Recent Purchases List */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    خریدهای اخیر
                  </span>
                  <span className="text-primary font-label-sm text-label-sm">
                    مشاهده همه فاکتورها
                  </span>
                </div>
                <div className="space-y-2">
                  {drawerUser.recentOrders && drawerUser.recentOrders.length > 0 ? (
                    drawerUser.recentOrders.map((ord, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-surface-container-low/70 flex items-center justify-between hover:bg-surface-container-low transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[20px]">
                              {ord.icon}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-label-md text-label-md text-on-surface">
                              {ord.title}
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              فاکتور {ord.invoice} • {ord.date}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-label-lg text-label-lg text-on-surface font-bold">
                            {formatToman(ord.amount)}
                          </span>
                          <span className="font-label-sm text-label-sm text-emerald-600">
                            {ord.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl bg-surface-container-low text-center text-on-surface-variant text-body-sm">
                      هیچ سفارشی برای این حساب تاکنون ثبت نشده است.
                    </div>
                  )}
                </div>
              </div>

              {/* Saved Address */}
              <div className="flex flex-col gap-3">
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  آدرس‌های ثبت‌شده برای تحویل کالا
                </span>
                {drawerUser.address ? (
                  <div className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary font-label-md text-label-md">
                        <span className="material-symbols-outlined text-[18px]">home_pin</span>
                        <span>{drawerUser.address.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-label-sm text-label-sm">
                        پیش‌فرض
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                      {drawerUser.address.fullAddress} کد پستی: {toPersianDigits(drawerUser.address.postalCode)}
                    </p>
                    <div className="flex items-center gap-4 text-on-surface-variant font-label-sm text-label-sm pt-1">
                      <span>تحویل‌گیرنده: {drawerUser.address.receiver}</span>
                      <span>تلفن: {toPersianDigits(drawerUser.address.phone)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-surface-container-low text-on-surface-variant text-body-sm">
                    آدرسی ثبت نشده است.
                  </div>
                )}
              </div>

              {/* Admin Quick Notes */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    یادداشت داخلی ادمین
                  </span>
                  <button
                    onClick={handleSaveAdminNote}
                    className="text-primary font-label-sm text-label-sm hover:underline"
                  >
                    ذخیره یادداشت
                  </button>
                </div>
                <textarea
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="ثبت توضیحات یا هماهنگی ویژه برای این مشتری..."
                  rows={2}
                  className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Drawer Action Footer */}
            <div className="p-4 bg-surface-container-low flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  showToast(`پروفایل کامل ${drawerUser.fullName} باز شد.`);
                }}
                className="flex-1 h-11 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                ویرایش کامل پروفایل
              </button>
              <button
                onClick={() => {
                  showToast(`تیکت پشتیبانی جدید برای ${drawerUser.fullName} ایجاد شد.`);
                }}
                className="h-11 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">chat</span>
                ارسال تیکت مستقیم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New User Modal Dialog */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">person_add</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  افزودن کاربر و تعریف دسترسی
                </h3>
              </div>
              <button
                onClick={() => setIsNewUserModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {newUserError && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">
                {newUserError}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">
                    نام و نام خانوادگی *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثال: کامران رستگار"
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">
                    شماره موبایل (جهت پیامک) *
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="۰۹۱۲*******"
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-left"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">
                    آدرس ایمیل *
                  </label>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@domain.com"
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-left"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">
                    سطح نقش و دسترسی
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="customer">مشتری عادی</option>
                    <option value="vip">مشتری طلایی / VIP</option>
                    <option value="warehouse_manager">مدیر انبار و موجودی</option>
                    <option value="support">اپراتور پشتیبانی و فروش</option>
                    <option value="super_admin">ادمین ارشد سیستم</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary-fixed/40 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">info</span>
                <p className="font-body-sm text-body-sm text-on-surface">
                  پس از ذخیره، پیامک حاوی لینک تعیین رمز عبور به شماره موبایل کاربر ارسال شده و حساب بلافاصله فعال خواهد شد.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="h-11 px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm"
                >
                  ثبت و ایجاد کاربر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  manage_accounts
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  تغییر سطح دسترسی کاربر
                </h3>
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                className="w-8 h-8 rounded-lg bg-surface-container text-on-surface flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleRoleChangeSubmit} className="flex flex-col gap-4">
              <span className="font-body-sm text-on-surface">
                کاربر: <strong>{roleModalUser.fullName}</strong>
              </span>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">نقش کاربری جدید:</label>
                <select
                  value={selectedRoleToUpdate}
                  onChange={(e) => setSelectedRoleToUpdate(e.target.value as UserRole)}
                  className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-md"
                >
                  <option value="customer">مشتری عادی</option>
                  <option value="vip">مشتری VIP طلایی</option>
                  <option value="warehouse_manager">مدیر انبار</option>
                  <option value="support">پشتیبانی سیستم</option>
                  <option value="super_admin">ادمین ارشد سیستم</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="h-10 px-4 rounded-xl bg-surface-container text-on-surface font-label-md"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-10 px-6 rounded-xl bg-primary text-on-primary font-label-md shadow-sm"
                >
                  ذخیره نقش
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
