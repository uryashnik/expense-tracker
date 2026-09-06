---
name: pr
description: Создание Pull Request по правилам проекта — заголовок в формате коммита с проверкой commitlint, тело по фактическому диффу (что и зачем, изменения контракта, решения, как проверено), создание через gh. Использовать, когда просят открыть/создать PR, «сделай пулреквест», «оформи PR», /pr.
effort: high
allowed-tools: Bash(git *), Bash(gh *)
argument-hint: <title> <base-branch, default main>
---

# PR Skill

Создай Pull Request на GitHub, соблюдая соглашения проекта.

## Arguments

- $0 - название PR
- $1 - целевая ветка

## Подготовка

1. Проверь что ветка готова:
   !`bash ${CLAUDE_SKILL_DIR}/scripts/validate.sh`
2. Получи diff от базовой ветки:
   !`git diff ${ARGUMENTS:-main}..HEAD`
3. Получи список коммитов:
   !`git log ${ARGUMENTS:-main}..HEAD --oneline

## Задача

Используя данные выше — заполни шаблон из @template.md.
Посмотри пример хорошего PR:
@examples/good-pr.md

## Создание PR

Создай PR командой:
gh pr create \
--title "$0 или сгенерированный title" \
--body "заполненный шаблон" \
--base "${ARGUMENTS:-main}"

## Правила

- Заголовок по conventional commits
- Если ветка не запушена:
  git push --set-upstream origin HEAD
