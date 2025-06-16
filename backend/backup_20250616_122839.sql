--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS fk_student_classe;
ALTER TABLE IF EXISTS ONLY public.student_restrictions DROP CONSTRAINT IF EXISTS fk_student2_restriction;
ALTER TABLE IF EXISTS ONLY public.student_preferences DROP CONSTRAINT IF EXISTS fk_student2_preference;
ALTER TABLE IF EXISTS ONLY public.student_restrictions DROP CONSTRAINT IF EXISTS fk_student1_restriction;
ALTER TABLE IF EXISTS ONLY public.student_preferences DROP CONSTRAINT IF EXISTS fk_student1_preference;
ALTER TABLE IF EXISTS ONLY public.taules_plantilla DROP CONSTRAINT IF EXISTS fk_plantilla_taula;
ALTER TABLE IF EXISTS ONLY public.distribucio_classes_filter DROP CONSTRAINT IF EXISTS fk_filter_distribucio;
ALTER TABLE IF EXISTS ONLY public.distribucio_classes_filter DROP CONSTRAINT IF EXISTS fk_filter_classe;
ALTER TABLE IF EXISTS ONLY public.distribucions DROP CONSTRAINT IF EXISTS fk_distribucio_plantilla;
ALTER TABLE IF EXISTS ONLY public.distribucio_assignacions DROP CONSTRAINT IF EXISTS fk_assignacio_taula_plantilla;
ALTER TABLE IF EXISTS ONLY public.distribucio_assignacions DROP CONSTRAINT IF EXISTS fk_assignacio_distribucio;
ALTER TABLE IF EXISTS ONLY public.distribucio_assignacions DROP CONSTRAINT IF EXISTS fk_assignacio_alumne;
DROP TRIGGER IF EXISTS set_timestamp_students ON public.students;
DROP TRIGGER IF EXISTS set_timestamp_distribucions ON public.distribucions;
DROP TRIGGER IF EXISTS set_timestamp_classes ON public.classes;
DROP TRIGGER IF EXISTS set_timestamp_aula_plantilles ON public.aula_plantilles;
DROP INDEX IF EXISTS public.idx_taules_plantilla_plantilla_id;
DROP INDEX IF EXISTS public.idx_students_name;
DROP INDEX IF EXISTS public.idx_students_id_classe_alumne;
DROP INDEX IF EXISTS public.idx_student_preferences_student_id_2;
DROP INDEX IF EXISTS public.idx_student_preferences_student_id_1;
DROP INDEX IF EXISTS public.idx_distribucions_plantilla_id;
DROP INDEX IF EXISTS public.idx_distribucio_classes_filter_id_classe;
DROP INDEX IF EXISTS public.idx_distribucio_classes_filter_distribucio_id;
DROP INDEX IF EXISTS public.idx_distribucio_assignacions_taula_plantilla_id;
DROP INDEX IF EXISTS public.idx_distribucio_assignacions_distribucio_id;
DROP INDEX IF EXISTS public.idx_distribucio_assignacions_alumne_id;
DROP INDEX IF EXISTS public.idx_classes_nom_classe;
DROP INDEX IF EXISTS public.idx_aula_plantilles_nom;
ALTER TABLE IF EXISTS ONLY public.taules_plantilla DROP CONSTRAINT IF EXISTS uq_identificador_taula_dins_plantilla;
ALTER TABLE IF EXISTS ONLY public.distribucio_classes_filter DROP CONSTRAINT IF EXISTS uq_distribucio_classe_filter;
ALTER TABLE IF EXISTS ONLY public.distribucio_assignacions DROP CONSTRAINT IF EXISTS uq_distribucio_alumne;
ALTER TABLE IF EXISTS ONLY public.taules_plantilla DROP CONSTRAINT IF EXISTS taules_plantilla_pkey;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_pkey;
ALTER TABLE IF EXISTS ONLY public.student_restrictions DROP CONSTRAINT IF EXISTS student_restrictions_pkey;
ALTER TABLE IF EXISTS ONLY public.student_preferences DROP CONSTRAINT IF EXISTS student_preferences_pkey;
ALTER TABLE IF EXISTS ONLY public.distribucions DROP CONSTRAINT IF EXISTS distribucions_pkey;
ALTER TABLE IF EXISTS ONLY public.distribucio_classes_filter DROP CONSTRAINT IF EXISTS distribucio_classes_filter_pkey;
ALTER TABLE IF EXISTS ONLY public.distribucio_assignacions DROP CONSTRAINT IF EXISTS distribucio_assignacions_pkey;
ALTER TABLE IF EXISTS ONLY public.classes DROP CONSTRAINT IF EXISTS classes_pkey;
ALTER TABLE IF EXISTS ONLY public.classes DROP CONSTRAINT IF EXISTS classes_nom_classe_key;
ALTER TABLE IF EXISTS ONLY public.aula_plantilles DROP CONSTRAINT IF EXISTS aula_plantilles_pkey;
ALTER TABLE IF EXISTS ONLY public.aula_plantilles DROP CONSTRAINT IF EXISTS aula_plantilles_nom_plantilla_key;
ALTER TABLE IF EXISTS public.taules_plantilla ALTER COLUMN id_taula_plantilla DROP DEFAULT;
ALTER TABLE IF EXISTS public.students ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.distribucions ALTER COLUMN id_distribucio DROP DEFAULT;
ALTER TABLE IF EXISTS public.distribucio_classes_filter ALTER COLUMN id_distribucio_filter DROP DEFAULT;
ALTER TABLE IF EXISTS public.distribucio_assignacions ALTER COLUMN id_assignacio DROP DEFAULT;
ALTER TABLE IF EXISTS public.classes ALTER COLUMN id_classe DROP DEFAULT;
ALTER TABLE IF EXISTS public.aula_plantilles ALTER COLUMN id_plantilla DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.taules_plantilla_id_taula_plantilla_seq;
DROP TABLE IF EXISTS public.taules_plantilla;
DROP SEQUENCE IF EXISTS public.students_id_seq;
DROP TABLE IF EXISTS public.students;
DROP TABLE IF EXISTS public.student_restrictions;
DROP TABLE IF EXISTS public.student_preferences;
DROP SEQUENCE IF EXISTS public.distribucions_id_distribucio_seq;
DROP TABLE IF EXISTS public.distribucions;
DROP SEQUENCE IF EXISTS public.distribucio_classes_filter_id_distribucio_filter_seq;
DROP TABLE IF EXISTS public.distribucio_classes_filter;
DROP SEQUENCE IF EXISTS public.distribucio_assignacions_id_assignacio_seq;
DROP TABLE IF EXISTS public.distribucio_assignacions;
DROP SEQUENCE IF EXISTS public.classes_id_classe_seq;
DROP TABLE IF EXISTS public.classes;
DROP SEQUENCE IF EXISTS public.aula_plantilles_id_plantilla_seq;
DROP TABLE IF EXISTS public.aula_plantilles;
DROP FUNCTION IF EXISTS public.trigger_set_timestamp_students();
DROP FUNCTION IF EXISTS public.trigger_set_timestamp_distribucions();
DROP FUNCTION IF EXISTS public.trigger_set_timestamp_classes();
DROP FUNCTION IF EXISTS public.trigger_set_timestamp_aula_plantilles();
--
-- Name: trigger_set_timestamp_aula_plantilles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_timestamp_aula_plantilles() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: trigger_set_timestamp_classes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_timestamp_classes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: trigger_set_timestamp_distribucions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_timestamp_distribucions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: trigger_set_timestamp_students(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_timestamp_students() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: aula_plantilles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aula_plantilles (
    id_plantilla integer NOT NULL,
    nom_plantilla character varying(255) NOT NULL,
    descripcio_plantilla text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: aula_plantilles_id_plantilla_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aula_plantilles_id_plantilla_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aula_plantilles_id_plantilla_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aula_plantilles_id_plantilla_seq OWNED BY public.aula_plantilles.id_plantilla;


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id_classe integer NOT NULL,
    nom_classe character varying(100) NOT NULL,
    descripcio_classe text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: classes_id_classe_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.classes_id_classe_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: classes_id_classe_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.classes_id_classe_seq OWNED BY public.classes.id_classe;


--
-- Name: distribucio_assignacions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distribucio_assignacions (
    id_assignacio integer NOT NULL,
    distribucio_id integer NOT NULL,
    alumne_id integer NOT NULL,
    taula_plantilla_id integer
);


--
-- Name: distribucio_assignacions_id_assignacio_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.distribucio_assignacions_id_assignacio_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: distribucio_assignacions_id_assignacio_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.distribucio_assignacions_id_assignacio_seq OWNED BY public.distribucio_assignacions.id_assignacio;


--
-- Name: distribucio_classes_filter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distribucio_classes_filter (
    id_distribucio_filter integer NOT NULL,
    distribucio_id integer NOT NULL,
    id_classe integer NOT NULL
);


--
-- Name: distribucio_classes_filter_id_distribucio_filter_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.distribucio_classes_filter_id_distribucio_filter_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: distribucio_classes_filter_id_distribucio_filter_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.distribucio_classes_filter_id_distribucio_filter_seq OWNED BY public.distribucio_classes_filter.id_distribucio_filter;


--
-- Name: distribucions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distribucions (
    id_distribucio integer NOT NULL,
    plantilla_id integer NOT NULL,
    nom_distribucio character varying(255) NOT NULL,
    descripcio_distribucio text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: distribucions_id_distribucio_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.distribucions_id_distribucio_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: distribucions_id_distribucio_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.distribucions_id_distribucio_seq OWNED BY public.distribucions.id_distribucio;


--
-- Name: student_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_preferences (
    student_id_1 integer NOT NULL,
    student_id_2 integer NOT NULL,
    CONSTRAINT check_no_self_preference CHECK ((student_id_1 <> student_id_2))
);


--
-- Name: student_restrictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_restrictions (
    student_id_1 integer NOT NULL,
    student_id_2 integer NOT NULL,
    CONSTRAINT check_different_students_restriction CHECK ((student_id_1 < student_id_2))
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    academic_grade numeric(4,2),
    gender character varying(50),
    id_classe_alumne integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT students_academic_grade_check CHECK (((academic_grade >= (0)::numeric) AND (academic_grade <= (10)::numeric)))
);


--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: taules_plantilla; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taules_plantilla (
    id_taula_plantilla integer NOT NULL,
    plantilla_id integer NOT NULL,
    identificador_taula_dins_plantilla character varying(100) NOT NULL,
    capacitat integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT taules_plantilla_capacitat_check CHECK ((capacitat > 0))
);


--
-- Name: taules_plantilla_id_taula_plantilla_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.taules_plantilla_id_taula_plantilla_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: taules_plantilla_id_taula_plantilla_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.taules_plantilla_id_taula_plantilla_seq OWNED BY public.taules_plantilla.id_taula_plantilla;


--
-- Name: aula_plantilles id_plantilla; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aula_plantilles ALTER COLUMN id_plantilla SET DEFAULT nextval('public.aula_plantilles_id_plantilla_seq'::regclass);


--
-- Name: classes id_classe; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes ALTER COLUMN id_classe SET DEFAULT nextval('public.classes_id_classe_seq'::regclass);


--
-- Name: distribucio_assignacions id_assignacio; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucio_assignacions ALTER COLUMN id_assignacio SET DEFAULT nextval('public.distribucio_assignacions_id_assignacio_seq'::regclass);


--
-- Name: distribucio_classes_filter id_distribucio_filter; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucio_classes_filter ALTER COLUMN id_distribucio_filter SET DEFAULT nextval('public.distribucio_classes_filter_id_distribucio_filter_seq'::regclass);


--
-- Name: distribucions id_distribucio; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucions ALTER COLUMN id_distribucio SET DEFAULT nextval('public.distribucions_id_distribucio_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: taules_plantilla id_taula_plantilla; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taules_plantilla ALTER COLUMN id_taula_plantilla SET DEFAULT nextval('public.taules_plantilla_id_taula_plantilla_seq'::regclass);


--
-- Data for Name: aula_plantilles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.aula_plantilles (id_plantilla, nom_plantilla, descripcio_plantilla, created_at, updated_at) FROM stdin;
2	Grups per 5è | Curs 2025-26	Distribució de nous grups per cinquè | curs 2025-2026	2025-06-15 18:16:49.466808+00	2025-06-15 18:16:49.466808+00
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.classes (id_classe, nom_classe, descripcio_classe, created_at, updated_at) FROM stdin;
2	4t-A	Curs 2025-2025	2025-06-12 10:53:23.24824+00	2025-06-15 18:12:52.529252+00
1	4t-B	Curs 2024-2025	2025-06-12 10:53:18.369994+00	2025-06-15 18:12:58.889065+00
\.


--
-- Data for Name: distribucio_assignacions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.distribucio_assignacions (id_assignacio, distribucio_id, alumne_id, taula_plantilla_id) FROM stdin;
551	12	8	4
552	12	41	3
553	12	28	3
554	12	37	4
555	12	1	4
556	12	32	3
557	12	31	3
558	12	17	4
559	12	27	3
560	12	22	4
561	12	21	4
562	12	49	3
563	12	50	4
564	12	47	4
565	12	15	3
566	12	30	4
567	12	14	3
568	12	29	3
569	12	33	3
570	12	35	4
571	12	3	3
572	12	44	4
573	12	46	4
574	12	24	4
575	12	16	3
576	12	11	4
577	12	10	4
578	12	40	3
579	12	6	4
580	12	4	3
581	12	13	3
582	12	2	4
583	12	23	3
584	12	9	4
585	12	26	3
586	12	18	3
587	12	43	3
588	12	20	4
589	12	39	3
590	12	38	3
591	12	12	3
592	12	34	3
593	12	36	4
594	12	7	4
595	12	48	3
596	12	25	3
597	12	5	4
598	12	45	4
599	12	19	4
600	12	42	4
651	14	8	4
652	14	41	3
653	14	28	3
654	14	37	4
655	14	1	4
656	14	32	3
657	14	31	3
658	14	17	4
659	14	27	3
660	14	22	4
661	14	21	4
662	14	49	3
663	14	50	4
664	14	47	4
665	14	15	3
666	14	30	4
667	14	14	3
668	14	29	3
669	14	33	3
670	14	35	4
671	14	3	3
672	14	44	4
673	14	46	4
674	14	24	4
675	14	16	4
676	14	11	4
677	14	10	4
678	14	40	3
679	14	6	4
680	14	4	3
681	14	13	3
682	14	2	4
683	14	23	3
684	14	9	4
685	14	26	3
686	14	18	3
687	14	43	3
688	14	20	\N
689	14	39	3
690	14	38	3
691	14	12	3
692	14	34	3
693	14	36	4
694	14	7	3
695	14	48	3
696	14	25	3
697	14	5	4
698	14	45	4
699	14	19	4
700	14	42	4
501	11	8	4
502	11	41	3
503	11	28	3
504	11	37	4
505	11	1	4
506	11	32	3
507	11	31	3
508	11	17	4
509	11	27	3
510	11	22	4
511	11	21	4
512	11	49	3
513	11	50	4
514	11	47	4
515	11	15	3
516	11	30	4
517	11	14	3
518	11	29	3
519	11	33	3
520	11	35	4
521	11	3	3
522	11	44	3
523	11	46	4
524	11	24	4
525	11	16	3
526	11	11	4
527	11	10	4
528	11	40	3
529	11	6	4
530	11	4	3
531	11	13	3
532	11	2	4
533	11	23	3
534	11	9	4
535	11	26	3
536	11	18	3
537	11	43	3
538	11	20	4
539	11	39	3
540	11	38	3
541	11	12	3
542	11	34	3
543	11	36	4
544	11	7	4
545	11	48	4
546	11	25	3
547	11	5	4
548	11	45	4
549	11	19	4
550	11	42	4
601	13	8	4
602	13	41	3
603	13	28	3
604	13	37	4
605	13	1	4
606	13	32	3
607	13	31	3
608	13	17	4
609	13	27	3
610	13	22	4
611	13	21	4
612	13	49	3
613	13	50	4
614	13	47	4
615	13	15	3
616	13	30	4
617	13	14	3
618	13	29	3
619	13	33	3
620	13	35	4
621	13	3	3
622	13	44	4
623	13	46	4
624	13	24	4
625	13	16	3
626	13	11	4
627	13	10	4
628	13	40	3
629	13	6	4
630	13	4	3
631	13	13	3
632	13	2	4
633	13	23	3
634	13	9	4
635	13	26	3
636	13	18	3
637	13	43	3
638	13	20	\N
639	13	39	3
640	13	38	3
641	13	12	3
642	13	34	3
643	13	36	4
644	13	7	4
645	13	48	3
646	13	25	3
647	13	5	4
648	13	45	4
649	13	19	4
650	13	42	4
\.


--
-- Data for Name: distribucio_classes_filter; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.distribucio_classes_filter (id_distribucio_filter, distribucio_id, id_classe) FROM stdin;
21	11	2
22	11	1
23	12	2
24	12	1
25	13	2
26	13	1
27	14	2
28	14	1
\.


--
-- Data for Name: distribucions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.distribucions (id_distribucio, plantilla_id, nom_distribucio, descripcio_distribucio, created_at, updated_at) FROM stdin;
11	2	Grups 5è | Curs 2025-2026	Prova 3	2025-06-15 21:28:15.770905+00	2025-06-15 21:28:15.770905+00
12	2	Grups 5è | Curs 2025-2026	Prova 3	2025-06-15 21:33:37.61083+00	2025-06-15 21:33:37.61083+00
13	2	Grups 5è | Curs 2025-2026	\N	2025-06-15 21:39:41.92008+00	2025-06-15 21:39:41.92008+00
14	2	Grups 5è | Curs 2025-2026	\N	2025-06-16 07:57:49.60056+00	2025-06-16 07:57:49.60056+00
\.


--
-- Data for Name: student_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_preferences (student_id_1, student_id_2) FROM stdin;
3	5
3	12
3	19
3	38
3	40
3	50
24	8
24	16
24	17
24	29
24	48
16	15
16	17
16	18
16	29
16	33
16	40
42	25
42	32
42	46
42	48
37	6
37	13
37	22
37	29
37	35
37	45
31	2
31	8
31	15
31	29
31	46
11	3
31	47
10	3
10	18
10	23
10	27
10	30
10	46
11	12
11	19
11	26
11	29
11	30
4	13
4	15
5	3
4	18
4	29
4	36
4	41
6	17
6	18
6	22
6	29
6	45
6	48
13	15
13	18
13	22
5	12
5	19
5	38
5	40
5	50
19	1
19	3
19	12
19	26
19	38
19	50
13	29
13	32
13	47
32	2
32	8
32	13
32	38
32	42
2	7
2	12
2	21
2	29
2	31
32	46
34	22
34	32
34	42
34	46
2	48
23	10
23	11
23	18
23	27
23	29
23	30
18	12
18	15
18	16
18	29
18	32
18	48
7	12
7	19
7	21
7	43
7	50
25	3
25	21
25	38
25	50
43	3
43	10
43	23
43	26
43	41
43	50
39	10
39	23
39	36
39	41
39	50
36	10
36	19
36	23
36	41
36	43
36	50
48	2
41	10
41	32
41	36
41	43
28	8
28	16
28	32
28	46
28	48
50	3
48	13
48	15
48	29
48	31
48	44
45	8
50	12
50	19
50	38
45	15
45	17
45	33
50	40
50	43
47	15
47	16
47	17
47	29
45	46
45	47
47	44
47	45
30	10
30	23
30	39
30	41
30	43
29	2
29	13
29	15
29	33
29	44
40	3
40	5
40	38
20	6
20	18
29	47
9	5
9	14
9	43
9	49
38	3
20	22
27	10
27	23
27	25
27	39
27	41
27	43
49	9
49	14
49	27
49	41
49	50
38	5
38	19
38	32
38	40
38	50
12	5
12	11
12	24
12	26
12	38
12	50
33	15
20	27
20	35
20	37
46	8
46	15
46	17
46	29
46	32
46	44
8	16
8	17
8	24
8	29
8	46
1	10
1	11
1	19
1	26
1	38
1	43
17	6
17	13
17	15
17	32
17	34
17	45
22	6
22	16
22	18
22	29
22	44
22	46
33	17
33	19
33	29
33	44
33	47
35	4
21	3
21	15
21	25
21	29
21	38
21	50
15	16
15	17
15	18
15	44
15	45
15	47
35	28
35	37
44	6
44	8
44	15
44	29
14	9
14	11
14	12
14	41
14	43
14	49
44	33
44	47
26	19
26	38
26	41
26	43
\.


--
-- Data for Name: student_restrictions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_restrictions (student_id_1, student_id_2) FROM stdin;
26	37
28	37
13	20
4	20
40	46
32	42
36	41
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.students (id, name, academic_grade, gender, id_classe_alumne, created_at, updated_at) FROM stdin;
20	Noah Roels	10.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:21:06.642952+00
7	Roc Galve	3.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:04:27.318403+00
25	Salma Zarfani	5.00	female	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:04:34.840299+00
28	Andrés Cáceres	7.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:04:45.456272+00
46	Hugo Pérez	7.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-15 21:12:26.393102+00
42	Yassin Khay	6.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-15 21:37:26.439899+00
41	Alba Jiménez	0.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-16 08:20:35.609795+00
27	Berta Andrés	7.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:04:56.174549+00
49	Cala Veciana	6.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:04:59.217717+00
31	Bastien De Bruyn	0.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-16 08:20:47.101401+00
50	Carlota Vilalta	0.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-16 08:23:14.494693+00
47	Eduard Picas	0.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-16 08:23:17.736789+00
33	Frank Domínguez	3.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:05:08.450281+00
35	Gael Esteban	9.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:05:11.205128+00
44	Gerard Molina	6.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:05:16.608752+00
30	Emma Cortés	0.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-16 08:23:23.990071+00
29	Fede Canino	1.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-16 08:23:28.588392+00
26	Nahiara Alves	8.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:05:24.887083+00
43	Nit Mensa	5.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:05:38.178063+00
10	Juliana Mago	1.00	female	2	2025-06-12 10:53:32.140419+00	2025-06-16 08:23:39.23415+00
39	Nora Geeson	2.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:05:40.328759+00
9	Montserrat Himeno	0.00	female	2	2025-06-12 10:53:32.140419+00	2025-06-16 08:23:49.171723+00
38	Ona García	0.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-16 08:23:57.203089+00
37	Antonio García	10.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:05:51.049369+00
12	Ona Martí	0.00	female	2	2025-06-12 10:53:32.140419+00	2025-06-16 08:23:59.771525+00
5	Sofia Dolgina	0.00	female	2	2025-06-12 10:53:32.140419+00	2025-06-16 08:26:13.79505+00
19	Victòria Riart	0.00	female	2	2025-06-12 10:53:32.140419+00	2025-06-16 08:26:18.229128+00
4	Martin De Araujo	10.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:05:59.639959+00
6	Marcel Fleury	10.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:06:07.771229+00
36	Rita Faure	1.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:06:21.311781+00
48	Roger Sánchez	6.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:06:24.692442+00
45	Unai Perdices	2.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:06:26.837611+00
8	Adrià Gimeno	6.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:03:10.099776+00
1	Ara Ayala	6.00	female	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:03:18.114331+00
17	Bastien Pinilla	2.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:03:21.777705+00
22	Biel Sanz	6.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:03:24.191862+00
21	Bruna Salvador	9.00	female	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:03:28.942364+00
15	Eloi Orte	1.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:03:31.909962+00
13	Martí Monfort	10.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:07:02.949453+00
14	Emma Ódena	4.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:03:39.383356+00
3	Gala Cortina	2.00	female	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:03:41.581001+00
24	Iu Valle	9.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:03:43.807646+00
16	Jofre Piera	4.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:03:46.732012+00
11	Juanita Marin	5.00	female	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:03:56.66499+00
32	Arnau De Gispert	9.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:11:17.818156+00
40	Kalinda Henly	7.00	female	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:11:56.292568+00
2	Max Compta	8.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:04:08.058365+00
23	Montse Sosa	2.00	female	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:04:10.697667+00
18	Nil Puga	7.00	male	2	2025-06-12 10:53:32.140419+00	2025-06-15 18:04:15.724933+00
34	Paul Escobar	10.00	male	1	2025-06-12 10:53:37.292652+00	2025-06-15 18:12:18.763375+00
\.


--
-- Data for Name: taules_plantilla; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.taules_plantilla (id_taula_plantilla, plantilla_id, identificador_taula_dins_plantilla, capacitat, created_at) FROM stdin;
3	2	5è-A	25	2025-06-15 18:16:49.466808+00
4	2	5è-B	25	2025-06-15 18:16:49.466808+00
\.


--
-- Name: aula_plantilles_id_plantilla_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.aula_plantilles_id_plantilla_seq', 2, true);


--
-- Name: classes_id_classe_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.classes_id_classe_seq', 2, true);


--
-- Name: distribucio_assignacions_id_assignacio_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.distribucio_assignacions_id_assignacio_seq', 700, true);


--
-- Name: distribucio_classes_filter_id_distribucio_filter_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.distribucio_classes_filter_id_distribucio_filter_seq', 28, true);


--
-- Name: distribucions_id_distribucio_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.distribucions_id_distribucio_seq', 14, true);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.students_id_seq', 50, true);


--
-- Name: taules_plantilla_id_taula_plantilla_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.taules_plantilla_id_taula_plantilla_seq', 4, true);


--
-- Name: aula_plantilles aula_plantilles_nom_plantilla_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aula_plantilles
    ADD CONSTRAINT aula_plantilles_nom_plantilla_key UNIQUE (nom_plantilla);


--
-- Name: aula_plantilles aula_plantilles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aula_plantilles
    ADD CONSTRAINT aula_plantilles_pkey PRIMARY KEY (id_plantilla);


--
-- Name: classes classes_nom_classe_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_nom_classe_key UNIQUE (nom_classe);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id_classe);


--
-- Name: distribucio_assignacions distribucio_assignacions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucio_assignacions
    ADD CONSTRAINT distribucio_assignacions_pkey PRIMARY KEY (id_assignacio);


--
-- Name: distribucio_classes_filter distribucio_classes_filter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucio_classes_filter
    ADD CONSTRAINT distribucio_classes_filter_pkey PRIMARY KEY (id_distribucio_filter);


--
-- Name: distribucions distribucions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucions
    ADD CONSTRAINT distribucions_pkey PRIMARY KEY (id_distribucio);


--
-- Name: student_preferences student_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_preferences
    ADD CONSTRAINT student_preferences_pkey PRIMARY KEY (student_id_1, student_id_2);


--
-- Name: student_restrictions student_restrictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_restrictions
    ADD CONSTRAINT student_restrictions_pkey PRIMARY KEY (student_id_1, student_id_2);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: taules_plantilla taules_plantilla_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taules_plantilla
    ADD CONSTRAINT taules_plantilla_pkey PRIMARY KEY (id_taula_plantilla);


--
-- Name: distribucio_assignacions uq_distribucio_alumne; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucio_assignacions
    ADD CONSTRAINT uq_distribucio_alumne UNIQUE (distribucio_id, alumne_id);


--
-- Name: distribucio_classes_filter uq_distribucio_classe_filter; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucio_classes_filter
    ADD CONSTRAINT uq_distribucio_classe_filter UNIQUE (distribucio_id, id_classe);


--
-- Name: taules_plantilla uq_identificador_taula_dins_plantilla; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taules_plantilla
    ADD CONSTRAINT uq_identificador_taula_dins_plantilla UNIQUE (plantilla_id, identificador_taula_dins_plantilla);


--
-- Name: idx_aula_plantilles_nom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aula_plantilles_nom ON public.aula_plantilles USING btree (nom_plantilla);


--
-- Name: idx_classes_nom_classe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classes_nom_classe ON public.classes USING btree (nom_classe);


--
-- Name: idx_distribucio_assignacions_alumne_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribucio_assignacions_alumne_id ON public.distribucio_assignacions USING btree (alumne_id);


--
-- Name: idx_distribucio_assignacions_distribucio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribucio_assignacions_distribucio_id ON public.distribucio_assignacions USING btree (distribucio_id);


--
-- Name: idx_distribucio_assignacions_taula_plantilla_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribucio_assignacions_taula_plantilla_id ON public.distribucio_assignacions USING btree (taula_plantilla_id);


--
-- Name: idx_distribucio_classes_filter_distribucio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribucio_classes_filter_distribucio_id ON public.distribucio_classes_filter USING btree (distribucio_id);


--
-- Name: idx_distribucio_classes_filter_id_classe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribucio_classes_filter_id_classe ON public.distribucio_classes_filter USING btree (id_classe);


--
-- Name: idx_distribucions_plantilla_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribucions_plantilla_id ON public.distribucions USING btree (plantilla_id);


--
-- Name: idx_student_preferences_student_id_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_preferences_student_id_1 ON public.student_preferences USING btree (student_id_1);


--
-- Name: idx_student_preferences_student_id_2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_preferences_student_id_2 ON public.student_preferences USING btree (student_id_2);


--
-- Name: idx_students_id_classe_alumne; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_id_classe_alumne ON public.students USING btree (id_classe_alumne);


--
-- Name: idx_students_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_name ON public.students USING btree (name);


--
-- Name: idx_taules_plantilla_plantilla_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_taules_plantilla_plantilla_id ON public.taules_plantilla USING btree (plantilla_id);


--
-- Name: aula_plantilles set_timestamp_aula_plantilles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_aula_plantilles BEFORE UPDATE ON public.aula_plantilles FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp_aula_plantilles();


--
-- Name: classes set_timestamp_classes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_classes BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp_classes();


--
-- Name: distribucions set_timestamp_distribucions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_distribucions BEFORE UPDATE ON public.distribucions FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp_distribucions();


--
-- Name: students set_timestamp_students; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_students BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp_students();


--
-- Name: distribucio_assignacions fk_assignacio_alumne; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucio_assignacions
    ADD CONSTRAINT fk_assignacio_alumne FOREIGN KEY (alumne_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: distribucio_assignacions fk_assignacio_distribucio; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucio_assignacions
    ADD CONSTRAINT fk_assignacio_distribucio FOREIGN KEY (distribucio_id) REFERENCES public.distribucions(id_distribucio) ON DELETE CASCADE;


--
-- Name: distribucio_assignacions fk_assignacio_taula_plantilla; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucio_assignacions
    ADD CONSTRAINT fk_assignacio_taula_plantilla FOREIGN KEY (taula_plantilla_id) REFERENCES public.taules_plantilla(id_taula_plantilla) ON DELETE CASCADE;


--
-- Name: distribucions fk_distribucio_plantilla; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucions
    ADD CONSTRAINT fk_distribucio_plantilla FOREIGN KEY (plantilla_id) REFERENCES public.aula_plantilles(id_plantilla) ON DELETE CASCADE;


--
-- Name: distribucio_classes_filter fk_filter_classe; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucio_classes_filter
    ADD CONSTRAINT fk_filter_classe FOREIGN KEY (id_classe) REFERENCES public.classes(id_classe) ON DELETE CASCADE;


--
-- Name: distribucio_classes_filter fk_filter_distribucio; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribucio_classes_filter
    ADD CONSTRAINT fk_filter_distribucio FOREIGN KEY (distribucio_id) REFERENCES public.distribucions(id_distribucio) ON DELETE CASCADE;


--
-- Name: taules_plantilla fk_plantilla_taula; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taules_plantilla
    ADD CONSTRAINT fk_plantilla_taula FOREIGN KEY (plantilla_id) REFERENCES public.aula_plantilles(id_plantilla) ON DELETE CASCADE;


--
-- Name: student_preferences fk_student1_preference; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_preferences
    ADD CONSTRAINT fk_student1_preference FOREIGN KEY (student_id_1) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_restrictions fk_student1_restriction; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_restrictions
    ADD CONSTRAINT fk_student1_restriction FOREIGN KEY (student_id_1) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_preferences fk_student2_preference; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_preferences
    ADD CONSTRAINT fk_student2_preference FOREIGN KEY (student_id_2) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_restrictions fk_student2_restriction; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_restrictions
    ADD CONSTRAINT fk_student2_restriction FOREIGN KEY (student_id_2) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students fk_student_classe; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT fk_student_classe FOREIGN KEY (id_classe_alumne) REFERENCES public.classes(id_classe) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

