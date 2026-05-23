/*
 * Adapted from:
 *   https://github.com/IUPAC-InChI/InChI-Web-Demo
 *     inchi/INCHI_WEB/inchi_web.c
 *
 * Copyright (c) IUPAC-InChI. MIT-licensed.
 *
 * JSON-emitting wrapper around the InChI C API entry points we
 * expose to JavaScript:
 *
 *   inchi_from_molfile
 *   inchikey_from_inchi
 *   molfile_from_inchi
 *   molfile_from_auxinfo
 *   structure_from_inchi  (atoms + bonds + 0D stereo, for JS-side rendering)
 *
 * Each function allocates a UTF-8 JSON string on the WASM heap and
 * returns its pointer. The JS caller must free() the pointer after
 * decoding.
 */

#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "inchi_api.h"
#include <emscripten.h>

/*
 * InChI from Molfile
 * ------------------
 */
EM_JS(char *, to_json_inchi, (int return_code, char *inchi, char *auxinfo, char *message, char *log), {
  const json = JSON.stringify({
    "return_code" : return_code,
    "inchi" : Module.UTF8ToString(inchi),
    "auxinfo" : Module.UTF8ToString(auxinfo),
    "message" : Module.UTF8ToString(message),
    "log" : Module.UTF8ToString(log)
  });

  const byteCount = Module.lengthBytesUTF8(json) + 1;
  const jsonPtr = Module._malloc(byteCount);
  Module.stringToUTF8(json, jsonPtr, byteCount);

  return jsonPtr;
});

char *inchi_from_molfile(char *molfile, char *options)
{
  int ret;
  inchi_Output *output;
  char *json;

  output = malloc(sizeof(*output));
  memset(output, 0, sizeof(*output));

  ret = MakeINCHIFromMolfileText(molfile, options, output);

  switch (ret)
  {
  case mol2inchi_Ret_OKAY:
  {
    json = to_json_inchi(0, output->szInChI, output->szAuxInfo, "", "");
    break;
  }
  case mol2inchi_Ret_WARNING:
  {
    json = to_json_inchi(1, output->szInChI, output->szAuxInfo, output->szMessage, output->szLog);
    break;
  }
  case mol2inchi_Ret_EOF:
  case mol2inchi_Ret_ERROR:
  case mol2inchi_Ret_ERROR_get:
  case mol2inchi_Ret_ERROR_comp:
  {
    json = to_json_inchi(-1, "", "", output->szMessage, output->szLog);
    break;
  }
  default:
  {
    json = to_json_inchi(-1, "", "", "", "MakeINCHIFromMolfileText: Unknown return code");
  }
  }

  FreeINCHI(output);
  free(output);

  return json;
}

/*
 * InChIKey from InChI
 * -------------------
 */
EM_JS(char *, to_json_inchikey, (int return_code, char *inchikey, char *message), {
  const json = JSON.stringify({
    "return_code" : return_code,
    "inchikey" : Module.UTF8ToString(inchikey),
    "message" : Module.UTF8ToString(message)
  });

  const byteCount = Module.lengthBytesUTF8(json) + 1;
  const jsonPtr = Module._malloc(byteCount);
  Module.stringToUTF8(json, jsonPtr, byteCount);

  return jsonPtr;
});

char *inchikey_from_inchi(char *inchi)
{
  int ret;
  char szINCHIKey[28], szXtra1[65], szXtra2[65];
  char *json;

  ret = GetINCHIKeyFromINCHI(inchi, 0, 0, szINCHIKey, szXtra1, szXtra2);

  switch (ret)
  {
  case INCHIKEY_OK:
  {
    json = to_json_inchikey(0, szINCHIKey, "");
    break;
  }
  case INCHIKEY_UNKNOWN_ERROR:
  {
    json = to_json_inchikey(-1, "", "GetINCHIKeyFromINCHI: Unknown program error");
    break;
  }
  case INCHIKEY_EMPTY_INPUT:
  {
    json = to_json_inchikey(-1, "", "GetINCHIKeyFromINCHI: Source string is empty");
    break;
  }
  case INCHIKEY_INVALID_INCHI_PREFIX:
  {
    json = to_json_inchikey(-1, "", "GetINCHIKeyFromINCHI: Invalid InChI prefix or invalid version (not 1)");
    break;
  }
  case INCHIKEY_NOT_ENOUGH_MEMORY:
  {
    json = to_json_inchikey(-1, "", "GetINCHIKeyFromINCHI: Not enough memory");
    break;
  }
  case INCHIKEY_INVALID_INCHI:
  {
    json = to_json_inchikey(-1, "", "GetINCHIKeyFromINCHI: Source InChI has invalid layout");
    break;
  }
  case INCHIKEY_INVALID_STD_INCHI:
  {
    json = to_json_inchikey(-1, "", "GetINCHIKeyFromINCHI: Source standard InChI has invalid layout");
    break;
  }
  default:
  {
    json = to_json_inchikey(-1, "", "GetINCHIKeyFromINCHI: Unknown return code");
  }
  }

  return json;
}

/*
 * Molfile from InChI
 * ------------------
 */
EM_JS(char *, to_json_molfile, (int return_code, char *molfile, char *message, char *log), {
  const json = JSON.stringify({
    "return_code" : return_code,
    "molfile" : Module.UTF8ToString(molfile),
    "message" : Module.UTF8ToString(message),
    "log" : Module.UTF8ToString(log)
  });

  const byteCount = Module.lengthBytesUTF8(json) + 1;
  const jsonPtr = Module._malloc(byteCount);
  Module.stringToUTF8(json, jsonPtr, byteCount);

  return jsonPtr;
});

inchi_InputEx inchi_OutputStructEx_to_inchi_InputEx(inchi_OutputStructEx *out)
{
  inchi_InputEx result;

  result.atom = out->atom;
  result.stereo0D = out->stereo0D;
  result.num_atoms = out->num_atoms;
  result.num_stereo0D = out->num_stereo0D;
  result.polymer = out->polymer;
  result.v3000 = out->v3000;

  return result;
}

char *molfile_from_inchi(char *inchi, char *options)
{
  int ret;
  inchi_InputINCHI input;
  inchi_OutputStructEx *output;
  char *json;

  input.szInChI = inchi;
  input.szOptions = options;

  output = malloc(sizeof(*output));
  memset(output, 0, sizeof(*output));

  ret = GetStructFromINCHIEx(&input, output);

  switch (ret)
  {
  case inchi_Ret_OKAY:
  {
    inchi_InputEx inputEx = inchi_OutputStructEx_to_inchi_InputEx(output);
    inputEx.szOptions = "-OutputSDF";
    inchi_Output outputEx;

    GetINCHIEx(&inputEx, &outputEx);

    json = to_json_molfile(0, outputEx.szInChI, "", "");
    FreeINCHI(&outputEx);

    break;
  }
  case inchi_Ret_WARNING:
  {
    inchi_InputEx inputEx = inchi_OutputStructEx_to_inchi_InputEx(output);
    inputEx.szOptions = "-OutputSDF";
    inchi_Output outputEx;

    GetINCHIEx(&inputEx, &outputEx);

    json = to_json_molfile(1, outputEx.szInChI, output->szMessage, output->szLog);
    FreeINCHI(&outputEx);

    break;
  }
  case inchi_Ret_ERROR:
  case inchi_Ret_FATAL:
  case inchi_Ret_UNKNOWN:
  case inchi_Ret_BUSY:
  case inchi_Ret_EOF:
  case inchi_Ret_SKIP:
  {
    json = to_json_molfile(-1, "", output->szMessage, output->szLog);
    break;
  }
  default:
    json = to_json_molfile(-1, "", "", "GetStructFromINCHIEx: Unknown return code");
  }

  FreeStructFromINCHIEx(output);
  free(output);

  return json;
}

/*
 * Molfile from AuxInfo
 * --------------------
 */
char *molfile_from_auxinfo(char *auxinfo, int bDoNotAddH, int bDiffUnkUndfStereo)
{
  int ret;
  InchiInpData *output;
  inchi_Input *pInp;
  char *json;

  output = malloc(sizeof(*output));
  memset(output, 0, sizeof(*output));
  pInp = malloc(sizeof(*pInp));
  memset(pInp, 0, sizeof(*pInp));

  output->pInp = pInp;

  ret = Get_inchi_Input_FromAuxInfo(auxinfo, bDoNotAddH, bDiffUnkUndfStereo, output);

  int output_chiral_flag = output->bChiral;
  char *options;
  switch (output_chiral_flag)
  {
  case 1:
  {
    options = "-OutputSDF -SUCF -ChiralFlagON";
    break;
  }
  case 2:
  {
    options = "-OutputSDF -SUCF -ChiralFlagOFF";
    break;
  }
  default:
    options = "-OutputSDF";
  }

  switch (ret)
  {
  case inchi_Ret_OKAY:
  {
    pInp->szOptions = options;
    inchi_Output inchi_output;

    GetINCHI(pInp, &inchi_output);

    json = to_json_molfile(0, inchi_output.szInChI, "", "");
    FreeINCHI(&inchi_output);

    break;
  }
  case inchi_Ret_WARNING:
  {
    pInp->szOptions = options;
    inchi_Output inchi_output;

    GetINCHI(pInp, &inchi_output);

    json = to_json_molfile(1, inchi_output.szInChI, output->szErrMsg, "");
    FreeINCHI(&inchi_output);

    break;
  }
  case inchi_Ret_ERROR:
  case inchi_Ret_FATAL:
  case inchi_Ret_UNKNOWN:
  case inchi_Ret_BUSY:
  case inchi_Ret_EOF:
  case inchi_Ret_SKIP:
  {
    json = to_json_molfile(-1, "", output->szErrMsg, "");
    break;
  }
  default:
    json = to_json_molfile(-1, "", "", "Get_inchi_Input_FromAuxInfo: Unknown return code");
  }

  Free_inchi_Input(pInp);
  free(output);
  free(pInp);

  return json;
}

/*
 * Structure from InChI
 * --------------------
 *
 * Returns JSON containing the parsed atoms, bonds, and 0D stereo
 * descriptors. Unlike molfile_from_inchi() (which delegates to the
 * IUPAC -OutputSDF writer and drops all stereo information), this
 * function exposes the raw inchi_OutputStructEx fields so the JS side
 * can build a molecule with correct parities and invent 2D coords
 * itself.
 *
 * JSON shape:
 * {
 *   "return_code": 0|1|-1,
 *   "message": string,
 *   "log": string,
 *   "atoms": [
 *     {
 *       "element": "C",
 *       "charge": 0,
 *       "radical": 0,
 *       "isotopicMass": 0,
 *       "implicitH": [auto, h1, h2, h3],
 *       "bonds": [{"to": <0-indexed>, "type": 1|2|3|4, "stereo": <2D wedge>}]
 *     },
 *     ...
 *   ],
 *   "stereo": [
 *     {
 *       "centralAtom": <0-indexed or -1>,
 *       "neighbors": [<0-indexed or -1>, ...],
 *       "type": 0|1|2|3,
 *       "parity": 0|1|2|3|4
 *     }
 *   ]
 * }
 */

typedef struct json_buf
{
  char *data;
  size_t len;
  size_t cap;
} json_buf;

static void jb_init(json_buf *b)
{
  b->cap = 1024;
  b->len = 0;
  b->data = malloc(b->cap);
  b->data[0] = '\0';
}

static void jb_grow(json_buf *b, size_t needed)
{
  if (b->len + needed + 1 > b->cap)
  {
    while (b->len + needed + 1 > b->cap)
    {
      b->cap *= 2;
    }
    b->data = realloc(b->data, b->cap);
  }
}

static void jb_append(json_buf *b, const char *s)
{
  size_t n = strlen(s);
  jb_grow(b, n);
  memcpy(b->data + b->len, s, n);
  b->len += n;
  b->data[b->len] = '\0';
}

static void jb_printf(json_buf *b, const char *fmt, ...)
{
  va_list ap;
  va_start(ap, fmt);
  va_list ap2;
  va_copy(ap2, ap);
  int n = vsnprintf(NULL, 0, fmt, ap);
  va_end(ap);
  if (n < 0)
  {
    va_end(ap2);
    return;
  }
  jb_grow(b, (size_t)n);
  vsnprintf(b->data + b->len, (size_t)n + 1, fmt, ap2);
  va_end(ap2);
  b->len += (size_t)n;
}

static void jb_append_json_string(json_buf *b, const char *s)
{
  jb_append(b, "\"");
  if (s)
  {
    for (const char *p = s; *p; p++)
    {
      unsigned char c = (unsigned char)*p;
      switch (c)
      {
      case '"':
        jb_append(b, "\\\"");
        break;
      case '\\':
        jb_append(b, "\\\\");
        break;
      case '\n':
        jb_append(b, "\\n");
        break;
      case '\r':
        jb_append(b, "\\r");
        break;
      case '\t':
        jb_append(b, "\\t");
        break;
      default:
        if (c < 0x20)
        {
          jb_printf(b, "\\u%04x", c);
        }
        else
        {
          char tmp[2] = {(char)c, 0};
          jb_append(b, tmp);
        }
      }
    }
  }
  jb_append(b, "\"");
}

static char *build_structure_json(int return_code,
                                  inchi_OutputStructEx *output)
{
  json_buf b;
  jb_init(&b);

  jb_printf(&b, "{\"return_code\":%d,", return_code);
  jb_append(&b, "\"message\":");
  jb_append_json_string(&b, output->szMessage);
  jb_append(&b, ",\"log\":");
  jb_append_json_string(&b, output->szLog);

  jb_append(&b, ",\"atoms\":[");
  for (int i = 0; i < output->num_atoms; i++)
  {
    inchi_Atom *a = &output->atom[i];
    if (i > 0)
    {
      jb_append(&b, ",");
    }
    jb_append(&b, "{\"element\":");
    jb_append_json_string(&b, a->elname);
    jb_printf(&b, ",\"charge\":%d,\"radical\":%d,\"isotopicMass\":%d,\"implicitH\":[%d,%d,%d,%d],\"bonds\":[",
              (int)a->charge, (int)a->radical, (int)a->isotopic_mass,
              (int)a->num_iso_H[0], (int)a->num_iso_H[1],
              (int)a->num_iso_H[2], (int)a->num_iso_H[3]);
    for (int j = 0; j < a->num_bonds; j++)
    {
      if (j > 0)
      {
        jb_append(&b, ",");
      }
      jb_printf(&b, "{\"to\":%d,\"type\":%d,\"stereo\":%d}",
                (int)a->neighbor[j], (int)a->bond_type[j],
                (int)a->bond_stereo[j]);
    }
    jb_append(&b, "]}");
  }
  jb_append(&b, "]");

  jb_append(&b, ",\"stereo\":[");
  for (int i = 0; i < output->num_stereo0D; i++)
  {
    inchi_Stereo0D *s = &output->stereo0D[i];
    if (i > 0)
    {
      jb_append(&b, ",");
    }
    jb_printf(&b, "{\"centralAtom\":%d,\"neighbors\":[%d,%d,%d,%d],\"type\":%d,\"parity\":%d}",
              (int)s->central_atom,
              (int)s->neighbor[0], (int)s->neighbor[1],
              (int)s->neighbor[2], (int)s->neighbor[3],
              (int)s->type, (int)s->parity);
  }
  jb_append(&b, "]}");

  return b.data;
}

EM_JS(char *, copy_json_to_heap, (const char *cstr), {
  const s = Module.UTF8ToString(cstr);
  const byteCount = Module.lengthBytesUTF8(s) + 1;
  const jsonPtr = Module._malloc(byteCount);
  Module.stringToUTF8(s, jsonPtr, byteCount);
  return jsonPtr;
});

static char *structure_error_json(const char *message, const char *log)
{
  json_buf b;
  jb_init(&b);
  jb_append(&b, "{\"return_code\":-1,\"message\":");
  jb_append_json_string(&b, message ? message : "");
  jb_append(&b, ",\"log\":");
  jb_append_json_string(&b, log ? log : "");
  jb_append(&b, ",\"atoms\":[],\"stereo\":[]}");
  return b.data;
}

char *structure_from_inchi(char *inchi, char *options)
{
  int ret;
  inchi_InputINCHI input;
  inchi_OutputStructEx *output;
  char *raw;
  char *json;

  input.szInChI = inchi;
  input.szOptions = options;

  output = malloc(sizeof(*output));
  memset(output, 0, sizeof(*output));

  ret = GetStructFromINCHIEx(&input, output);

  switch (ret)
  {
  case inchi_Ret_OKAY:
    raw = build_structure_json(0, output);
    break;
  case inchi_Ret_WARNING:
    raw = build_structure_json(1, output);
    break;
  case inchi_Ret_ERROR:
  case inchi_Ret_FATAL:
  case inchi_Ret_UNKNOWN:
  case inchi_Ret_BUSY:
  case inchi_Ret_EOF:
  case inchi_Ret_SKIP:
    raw = structure_error_json(output->szMessage, output->szLog);
    break;
  default:
    raw = structure_error_json("", "GetStructFromINCHIEx: Unknown return code");
  }

  /* `raw` was malloc'd by libc inside the WASM linear-memory heap, same as
   * Module._malloc, so we could return it directly. We copy it through
   * the JS-side allocator anyway for symmetry with the other to_json_*
   * helpers, which lets the JS caller free it with the usual ccall path.
   */
  json = copy_json_to_heap(raw);
  free(raw);

  FreeStructFromINCHIEx(output);
  free(output);

  return json;
}
