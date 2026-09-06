---
name: pr
description: Создание Pull Request по правилам проекта — заголовок в формате коммита с проверкой commitlint, тело по фактическому диффу (что и зачем, изменения контракта, решения, как проверено), создание через gh. Использовать, когда просят открыть/создать PR, «сделай пулреквест», «оформи PR», /pr.
effort: high
allowed-tools: Bash(git *), Bash(gh *), Bash(npx commitlint*)
argument-hint: "<title>" <base-branch, default main>
---

# PR Skill

Создай Pull Request на GitHub, соблюдая соглашения проекта.

## Arguments

- $1 - название PR, всегда в кавычках: `/pr "rework pr skill"`
- $2 - целевая ветка

## Подготовка

1. Проверь что ветка готова:
   !`bash ${CLAUDE_SKILL_DIR}/scripts/validate.sh ${2:-main}`
2. Проверь, не открыт ли уже PR для этой ветки:
   !`gh pr view --json number,url,state 2>/dev/null || echo "открытого PR нет"`
3. Получи diff от базовой ветки:
   !`git diff ${2:-main}..HEAD`
4. Получи список коммитов:
   !`git log ${2:-main}..HEAD --oneline`

## Задача

Используя данные выше — заполни шаблон из @template.md.
Посмотри пример хорошего PR:
@examples/good-pr.md

## Создание PR

Создай PR командой:
gh pr create \
--title "$1 или сгенерированный title" \
--body "заполненный шаблон" \
--base "${2:-main}"

## Правила

- Заголовок по conventional commits. Мержим squash-мержем, поэтому заголовок PR
  становится сообщением коммита в базе и обязан проходить commitlint. Проверь до
  создания PR (молчаливый выход = формат в порядке):
  ```bash
  echo 'refactor(repo): rework pr skill' | npx commitlint
  ```
- Если ветка не запушена:
  git push --set-upstream origin HEAD
- PR для ветки уже открыт — не создавать второй, обновить существующий:
  gh pr edit --title/--body-file
