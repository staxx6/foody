// Writes and checks ZIP files without a dependency. Enough for backups: no
// ZIP64, so less than 4 GB and 65535 files.
import {
  closeSync,
  openSync,
  readFileSync,
  readdirSync,
  statSync,
  writeSync,
} from 'node:fs';
import { join, relative, sep } from 'node:path';
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

const STORED = 0;
const DEFLATED = 8;
// Compressed already, deflating them would only cost time
const COMPRESSED = /\.(jpe?g|png|webp|gif|avif|heic|zip|gz)$/i;
// Version 2.0 is the one that knows deflate; bit 11 says names are UTF-8
const VERSION = 20;
const UTF8 = 0x0800;

/** Time and date of a file as ZIP stores them (MS-DOS format, local time) */
function dosTime(date) {
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((Math.max(date.getFullYear(), 1980) - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
  };
}

/** The files in a folder and its subfolders */
export function filesIn(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * Writes a ZIP file
 * @param target the file to write
 * @param entries the files: `path` on disk and `name` in the archive
 */
export function writeZip(target, entries) {
  const fd = openSync(target, 'w');
  const central = [];
  let offset = 0;
  const write = (buffer) => {
    writeSync(fd, buffer);
    offset += buffer.length;
  };

  try {
    for (const { path, name } of entries) {
      const data = readFileSync(path);
      const deflated = COMPRESSED.test(name) ? null : deflateRawSync(data);
      // Stored if deflating does not make it smaller
      const packed =
        deflated && deflated.length < data.length ? deflated : data;
      const method = packed === data ? STORED : DEFLATED;
      const { time, date } = dosTime(statSync(path).mtime);
      const nameBytes = Buffer.from(name, 'utf8');
      const crc = crc32(data);

      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(VERSION, 4);
      local.writeUInt16LE(UTF8, 6);
      local.writeUInt16LE(method, 8);
      local.writeUInt16LE(time, 10);
      local.writeUInt16LE(date, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(packed.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(nameBytes.length, 26);
      const localOffset = offset;
      write(local);
      write(nameBytes);
      write(packed);

      const header = Buffer.alloc(46);
      header.writeUInt32LE(0x02014b50, 0);
      header.writeUInt16LE(VERSION, 4);
      header.writeUInt16LE(VERSION, 6);
      header.writeUInt16LE(UTF8, 8);
      header.writeUInt16LE(method, 10);
      header.writeUInt16LE(time, 12);
      header.writeUInt16LE(date, 14);
      header.writeUInt32LE(crc, 16);
      header.writeUInt32LE(packed.length, 20);
      header.writeUInt32LE(data.length, 24);
      header.writeUInt16LE(nameBytes.length, 28);
      header.writeUInt32LE(localOffset, 42);
      central.push(header, nameBytes);
    }

    const start = offset;
    for (const part of central) write(part);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(offset - start, 12);
    end.writeUInt32LE(start, 16);
    write(end);
  } finally {
    closeSync(fd);
  }
}

/**
 * Reads every file of a ZIP file and compares it with its checksum
 * @returns the content of the files by their name
 * @throws if a file cannot be read or is not what was written
 */
export function readZip(file) {
  const zip = readFileSync(file);
  const end = zip.length - 22;
  if (zip.readUInt32LE(end) !== 0x06054b50) throw new Error('No end record');
  const count = zip.readUInt16LE(end + 10);
  let position = zip.readUInt32LE(end + 16);

  const files = new Map();
  for (let index = 0; index < count; index++) {
    if (zip.readUInt32LE(position) !== 0x02014b50) {
      throw new Error(`Damaged directory at entry ${index}`);
    }
    const method = zip.readUInt16LE(position + 10);
    const crc = zip.readUInt32LE(position + 16);
    const packedSize = zip.readUInt32LE(position + 20);
    const nameLength = zip.readUInt16LE(position + 28);
    const localOffset = zip.readUInt32LE(position + 42);
    const name = zip.toString(
      'utf8',
      position + 46,
      position + 46 + nameLength,
    );
    position += 46 + nameLength;

    const dataStart =
      localOffset +
      30 +
      zip.readUInt16LE(localOffset + 26) +
      zip.readUInt16LE(localOffset + 28);
    const packed = zip.subarray(dataStart, dataStart + packedSize);
    const data = method === DEFLATED ? inflateRawSync(packed) : packed;
    if (crc32(data) !== crc) throw new Error(`Damaged file: ${name}`);
    files.set(name, data);
  }
  return files;
}

/** The name of a file in an archive: relative, with forward slashes */
export function nameIn(base, path) {
  return relative(base, path).split(sep).join('/');
}
