# Nexus tokens (local copy)

Files in this folder are copied verbatim from `../../nexus-design-system/src/styles/` so this project can build without a sibling-path dependency for styling. Atoms are still resolved via the Vite alias to the sibling project — only the foundational token/base stylesheets are copied.

When Nexus publishes token changes, re-copy:

    cp ../../nexus-design-system/src/styles/tokens.scss ./tokens.scss
    cp ../../nexus-design-system/src/styles/base.css ./base.css

Unused tokens can be pruned in-place. Keep the file structure and variable names intact.
