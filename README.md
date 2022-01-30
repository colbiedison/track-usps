# track-usps

track-usps is a CLI package tracker for USPS packages, made with Node.js

## Installation

Currently Linux-only (API request is made with a bash script)

Requires a [USPS Web Tools](https://www.usps.com/business/web-tools-apis/) API key. Place your key in a file called `apikey` in the project directory, or use the `--key` option.

Requires [node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/)

Clone this git repo:

```bash
git clone https://github.com/colbiedison/track-usps.git
```
Install dependencies:
```bash
cd track-usps/
npm install
```

## Usage

```bash
node index.js [options] <tracking number>

# For a list of options, see:
node index.js --help
```

## Example
![](https://media.discordapp.net/attachments/937427978953039902/937428110448668792/unknown.png)

## License
[GNU Lesser General Public License v3.0](https://choosealicense.com/licenses/mit/)
