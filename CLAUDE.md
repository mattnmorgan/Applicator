# Claude Code Instructions

## Important Rules

### Windows-Specific
- **NEVER create a file named `nul`** - On Windows, `nul` is a reserved device name (equivalent to `/dev/null` on Unix). Creating a file with this name causes issues and should be avoided entirely.
- Avoid creating files with other Windows reserved names: `con`, `prn`, `aux`, `com1`-`com9`, `lpt1`-`lpt9`

## Project Structure

- `lib/` - Shared library (published as `@applicator/lib` for npm link)
- `app/` - Next.js application pages and API routes
- `public/` - Static assets
