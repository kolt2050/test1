"""
Игра Сапёр (Minesweeper) для Android
Разработано с использованием Kivy
"""

from kivy.app import App
from kivy.uix.gridlayout import GridLayout
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.popup import Popup
from kivy.uix.spinner import Spinner
from kivy.clock import Clock
from kivy.core.window import Window
from kivy.utils import get_color_from_hex
from kivy.graphics import Color, Rectangle
import random

# Цвета для чисел
NUMBER_COLORS = {
    1: '#0000FF',  # Синий
    2: '#008000',  # Зелёный
    3: '#FF0000',  # Красный
    4: '#000080',  # Тёмно-синий
    5: '#800000',  # Бордовый
    6: '#008080',  # Бирюзовый
    7: '#000000',  # Чёрный
    8: '#808080',  # Серый
}


class Cell(Button):
    """Класс ячейки игрового поля"""
    
    def __init__(self, row, col, **kwargs):
        super().__init__(**kwargs)
        self.row = row
        self.col = col
        self.is_mine = False
        self.is_revealed = False
        self.is_flagged = False
        self.adjacent_mines = 0
        self.font_size = '20sp'
        self.background_color = get_color_from_hex('#BBBBBB')
        self.background_normal = ''
        self.background_down = ''
        self.bold = True
        
    def reset(self):
        """Сброс ячейки"""
        self.is_mine = False
        self.is_revealed = False
        self.is_flagged = False
        self.adjacent_mines = 0
        self.text = ''
        self.background_color = get_color_from_hex('#BBBBBB')
        self.disabled = False


class MinesweeperGrid(GridLayout):
    """Игровое поле Сапёра"""
    
    def __init__(self, rows, cols, mines, game_app, **kwargs):
        super().__init__(**kwargs)
        self.rows_count = rows
        self.cols_count = cols
        self.mines_count = mines
        self.game_app = game_app
        self.cells = {}
        self.first_click = True
        self.game_over = False
        self.flags_placed = 0
        self.revealed_count = 0
        
        self.cols = cols
        self.spacing = 2
        self.padding = 5
        
        self.create_grid()
        
    def create_grid(self):
        """Создание сетки ячеек"""
        self.clear_widgets()
        self.cells = {}
        
        for row in range(self.rows_count):
            for col in range(self.cols_count):
                cell = Cell(row, col)
                cell.bind(on_press=self.on_cell_press)
                cell.bind(on_release=self.on_cell_release)
                self.cells[(row, col)] = cell
                self.add_widget(cell)
                
    def reset_game(self):
        """Сброс игры"""
        self.first_click = True
        self.game_over = False
        self.flags_placed = 0
        self.revealed_count = 0
        
        for cell in self.cells.values():
            cell.reset()
            
        self.game_app.update_mines_label()
        self.game_app.reset_timer()
        
    def place_mines(self, safe_row, safe_col):
        """Расстановка мин (исключая безопасную зону вокруг первого клика)"""
        safe_cells = set()
        for dr in range(-1, 2):
            for dc in range(-1, 2):
                r, c = safe_row + dr, safe_col + dc
                if 0 <= r < self.rows_count and 0 <= c < self.cols_count:
                    safe_cells.add((r, c))
        
        available_cells = [(r, c) for r in range(self.rows_count) 
                          for c in range(self.cols_count) 
                          if (r, c) not in safe_cells]
        
        mine_positions = random.sample(available_cells, min(self.mines_count, len(available_cells)))
        
        for row, col in mine_positions:
            self.cells[(row, col)].is_mine = True
            
        # Подсчёт соседних мин для каждой ячейки
        for row in range(self.rows_count):
            for col in range(self.cols_count):
                if not self.cells[(row, col)].is_mine:
                    count = 0
                    for dr in range(-1, 2):
                        for dc in range(-1, 2):
                            r, c = row + dr, col + dc
                            if (r, c) in self.cells and self.cells[(r, c)].is_mine:
                                count += 1
                    self.cells[(row, col)].adjacent_mines = count
                    
    def on_cell_press(self, cell):
        """Начало нажатия на ячейку"""
        if self.game_over or cell.is_revealed:
            return
        self.press_start_time = Clock.get_time()
        
    def on_cell_release(self, cell):
        """Обработка отпускания ячейки"""
        if self.game_over or cell.is_revealed:
            return
            
        press_duration = Clock.get_time() - getattr(self, 'press_start_time', 0)
        
        # Долгое нажатие - установка/снятие флага
        if press_duration > 0.5:
            self.toggle_flag(cell)
        else:
            # Короткое нажатие - открытие ячейки
            if not cell.is_flagged:
                self.reveal_cell(cell)
                
    def toggle_flag(self, cell):
        """Установка/снятие флага"""
        if cell.is_revealed:
            return
            
        if cell.is_flagged:
            cell.is_flagged = False
            cell.text = ''
            cell.background_color = get_color_from_hex('#BBBBBB')
            self.flags_placed -= 1
        else:
            cell.is_flagged = True
            cell.text = '🚩'
            cell.background_color = get_color_from_hex('#FFCC00')
            self.flags_placed += 1
            
        self.game_app.update_mines_label()
        
    def reveal_cell(self, cell):
        """Открытие ячейки"""
        if cell.is_revealed or cell.is_flagged:
            return
            
        # Первый клик - расставляем мины
        if self.first_click:
            self.first_click = False
            self.place_mines(cell.row, cell.col)
            self.game_app.start_timer()
            
        cell.is_revealed = True
        self.revealed_count += 1
        
        if cell.is_mine:
            self.game_over_lose(cell)
            return
            
        cell.disabled = True
        cell.background_color = get_color_from_hex('#DDDDDD')
        
        if cell.adjacent_mines > 0:
            cell.text = str(cell.adjacent_mines)
            cell.color = get_color_from_hex(NUMBER_COLORS.get(cell.adjacent_mines, '#000000'))
        else:
            # Открываем соседние ячейки рекурсивно
            for dr in range(-1, 2):
                for dc in range(-1, 2):
                    r, c = cell.row + dr, cell.col + dc
                    if (r, c) in self.cells:
                        neighbor = self.cells[(r, c)]
                        if not neighbor.is_revealed and not neighbor.is_flagged:
                            self.reveal_cell(neighbor)
                            
        # Проверка победы
        self.check_win()
        
    def check_win(self):
        """Проверка победы"""
        total_cells = self.rows_count * self.cols_count
        if self.revealed_count == total_cells - self.mines_count:
            self.game_over = True
            self.game_app.stop_timer()
            self.show_win_popup()
            
    def game_over_lose(self, clicked_mine):
        """Обработка проигрыша"""
        self.game_over = True
        self.game_app.stop_timer()
        
        # Показываем все мины
        for cell in self.cells.values():
            if cell.is_mine:
                if cell == clicked_mine:
                    cell.background_color = get_color_from_hex('#FF0000')
                else:
                    cell.background_color = get_color_from_hex('#FF6666')
                cell.text = '💣'
            elif cell.is_flagged:
                # Неправильный флаг
                cell.text = '❌'
                cell.background_color = get_color_from_hex('#FF9999')
                
        self.show_lose_popup()
        
    def show_win_popup(self):
        """Показ окна победы"""
        content = BoxLayout(orientation='vertical', padding=10, spacing=10)
        content.add_widget(Label(
            text=f'🎉 Поздравляем!\n\nВы выиграли!\nВремя: {self.game_app.time_elapsed} сек.',
            font_size='20sp',
            halign='center'
        ))
        btn = Button(text='Новая игра', size_hint_y=0.3, font_size='18sp')
        content.add_widget(btn)
        
        popup = Popup(title='Победа!', content=content, size_hint=(0.8, 0.4))
        btn.bind(on_press=lambda x: (popup.dismiss(), self.reset_game()))
        popup.open()
        
    def show_lose_popup(self):
        """Показ окна поражения"""
        content = BoxLayout(orientation='vertical', padding=10, spacing=10)
        content.add_widget(Label(
            text='💥 Вы наступили на мину!\n\nИгра окончена.',
            font_size='20sp',
            halign='center'
        ))
        btn = Button(text='Попробовать снова', size_hint_y=0.3, font_size='18sp')
        content.add_widget(btn)
        
        popup = Popup(title='Поражение', content=content, size_hint=(0.8, 0.4))
        btn.bind(on_press=lambda x: (popup.dismiss(), self.reset_game()))
        popup.open()


class MinesweeperApp(App):
    """Главное приложение"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.difficulty = 'Средний'
        self.difficulties = {
            'Лёгкий': (8, 8, 10),
            'Средний': (12, 10, 25),
            'Сложный': (16, 12, 50),
        }
        self.time_elapsed = 0
        self.timer_event = None
        
    def build(self):
        """Построение интерфейса"""
        self.title = 'Сапёр'
        
        # Основной контейнер
        main_layout = BoxLayout(orientation='vertical', padding=10, spacing=10)
        
        # Верхняя панель
        top_panel = BoxLayout(orientation='horizontal', size_hint_y=0.1, spacing=10)
        
        # Счётчик мин
        self.mines_label = Label(
            text='💣 0',
            font_size='22sp',
            size_hint_x=0.3
        )
        top_panel.add_widget(self.mines_label)
        
        # Кнопка новой игры
        new_game_btn = Button(
            text='🔄 Новая',
            font_size='18sp',
            size_hint_x=0.4
        )
        new_game_btn.bind(on_press=self.new_game)
        top_panel.add_widget(new_game_btn)
        
        # Таймер
        self.timer_label = Label(
            text='⏱ 0',
            font_size='22sp',
            size_hint_x=0.3
        )
        top_panel.add_widget(self.timer_label)
        
        main_layout.add_widget(top_panel)
        
        # Выбор сложности
        difficulty_layout = BoxLayout(orientation='horizontal', size_hint_y=0.08, spacing=10)
        difficulty_layout.add_widget(Label(text='Сложность:', font_size='16sp', size_hint_x=0.4))
        
        self.difficulty_spinner = Spinner(
            text=self.difficulty,
            values=list(self.difficulties.keys()),
            font_size='16sp',
            size_hint_x=0.6
        )
        self.difficulty_spinner.bind(text=self.on_difficulty_change)
        difficulty_layout.add_widget(self.difficulty_spinner)
        
        main_layout.add_widget(difficulty_layout)
        
        # Игровое поле
        rows, cols, mines = self.difficulties[self.difficulty]
        self.grid = MinesweeperGrid(rows, cols, mines, self)
        main_layout.add_widget(self.grid)
        
        # Подсказка
        hint_label = Label(
            text='Короткое нажатие - открыть\nДолгое нажатие - флаг 🚩',
            font_size='14sp',
            size_hint_y=0.1,
            halign='center'
        )
        main_layout.add_widget(hint_label)
        
        self.update_mines_label()
        
        return main_layout
        
    def on_difficulty_change(self, spinner, text):
        """Изменение сложности"""
        self.difficulty = text
        rows, cols, mines = self.difficulties[text]
        
        # Удаляем старое поле и создаём новое
        parent = self.grid.parent
        parent.remove_widget(self.grid)
        
        self.grid = MinesweeperGrid(rows, cols, mines, self)
        parent.add_widget(self.grid, index=1)  # Добавляем перед подсказкой
        
        self.update_mines_label()
        self.reset_timer()
        
    def new_game(self, instance=None):
        """Начать новую игру"""
        self.grid.reset_game()
        
    def update_mines_label(self):
        """Обновление счётчика мин"""
        remaining = self.grid.mines_count - self.grid.flags_placed
        self.mines_label.text = f'💣 {remaining}'
        
    def start_timer(self):
        """Запуск таймера"""
        self.time_elapsed = 0
        self.timer_event = Clock.schedule_interval(self.update_timer, 1)
        
    def stop_timer(self):
        """Остановка таймера"""
        if self.timer_event:
            self.timer_event.cancel()
            self.timer_event = None
            
    def reset_timer(self):
        """Сброс таймера"""
        self.stop_timer()
        self.time_elapsed = 0
        self.timer_label.text = '⏱ 0'
        
    def update_timer(self, dt):
        """Обновление таймера"""
        self.time_elapsed += 1
        self.timer_label.text = f'⏱ {self.time_elapsed}'


if __name__ == '__main__':
    MinesweeperApp().run()
