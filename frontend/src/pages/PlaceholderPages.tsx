import React from 'react';

export const CoursesPage: React.FC = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Список курсов</h1>
    <p className="text-muted-foreground mt-4">Здесь будет карточная сетка доступных курсов.</p>
  </div>
);

export const TasksPage: React.FC = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Список задач</h1>
    <p className="text-muted-foreground mt-4">Глобальный список задач вне контекста конкретного курса.</p>
  </div>
);

export const SettingsPage: React.FC = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Настройки</h1>
    <p className="text-muted-foreground mt-4">Настройки приложения, профиля, внешнего вида.</p>
  </div>
);

export const ProfilePage: React.FC = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Профиль</h1>
    <p className="text-muted-foreground mt-4">Статистика пользователя, достижения и прогресс.</p>
  </div>
);
