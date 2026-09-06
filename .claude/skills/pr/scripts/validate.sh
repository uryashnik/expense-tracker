base="${1:-main}"
branch=$(git branch --show-current)

# Нельзя создавать PR из базовой или защищённой ветки
if [ "$branch" = "$base" ] || [ "$branch" = "main" ] || [ "$branch" = "develop" ]; then
  echo "ERROR: нельзя создавать PR из ветки '$branch'"
  echo "Заведи ветку: git switch -c <тип>/<scope>-<краткое-описание>"
  exit 1
fi

# Сравниваем с origin/<base>: локальная копия может отставать
git fetch origin "$base" --quiet 2>/dev/null
ref="origin/$base"
if ! git rev-parse --verify --quiet "$ref" >/dev/null; then
  echo "ERROR: ветки '$base' нет на origin"
  exit 1
fi

# Проверяем что есть коммиты отличные от базы
commits=$(git log "$ref..HEAD" --oneline | wc -l | tr -d ' ')
if [ "$commits" -eq 0 ]; then
  echo "ERROR: нет коммитов отличных от $ref"
  echo "Сделай хотя бы один коммит перед созданием PR"
  exit 1
fi

echo "OK: ветка '$branch' готова к PR ($commits коммитов относительно $ref)"
