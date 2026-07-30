## Git Branch
Never change branches — always commit and push to whichever branch is already checked out.

### Chrome session (already authenticated)
- Chrome is already running with a **logged-in `proton.me` session**. Reuse it — do **not** log out, clear cookies, use an incognito/guest window, or start a fresh profile, or you will lose the session.
- To read a verification email, open a tab on `https://mail.proton.me` in that same window; the inbox loads without re-authenticating.

### Finding and launching Chrome
Chrome may already be running. If it is not, locate the binary on disk and launch it rather than assuming a fixed path:

```bash
# Is it already running?
tasklist.exe | grep -i chrome

# Known locations on this machine (prefer the 64-bit one):
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
"/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"

# If neither exists, search for it:
ls /usr/bin/*chrom* /opt/google/chrome/chrome 2>/dev/null
find "/mnt/c/Program Files" "/mnt/c/Program Files (x86)" "/mnt/c/Users/$USER/AppData/Local" \
  -maxdepth 5 -name 'chrome.exe' 2>/dev/null

# Launch with the default profile (keeps the proton.me session):
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" &
```

There is no Linux Chrome inside WSL — the browser is the Windows host Chrome.
