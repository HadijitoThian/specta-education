import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Edit, Trash2, GraduationCap, Globe, DollarSign,
  BookOpen, ChevronDown, ChevronUp, Loader2, Search, X,
  ToggleLeft, ToggleRight, Building2
} from "lucide-react";

const COUNTRIES = [
  "Malaysia", "Singapore", "Australia", "United Kingdom", "USA",
  "Canada", "China", "Ireland", "Netherlands", "New Zealand",
  "Japan", "South Korea", "Germany", "Thailand"
];

const RIASEC_LABELS: Record<string, string> = {
  R: "Realistic", I: "Investigative", A: "Artistic",
  S: "Social", E: "Enterprising", C: "Conventional"
};

const MI_OPTIONS = [
  "linguistic", "logical", "spatial", "musical",
  "kinesthetic", "interpersonal", "intrapersonal", "naturalistic"
];

const DEGREE_LEVELS = ["bachelor", "master", "doctorate", "diploma"] as const;

const FIELD_OF_STUDY_OPTIONS = [
  "Engineering", "Computer Science", "Business Administration", "Medicine",
  "Law", "Architecture", "Psychology", "Education", "Arts & Design",
  "Communication", "Economics", "Accounting", "Finance", "Marketing",
  "International Relations", "Environmental Science", "Biology", "Chemistry",
  "Physics", "Mathematics", "Data Science", "Information Technology",
  "Hospitality & Tourism", "Culinary Arts", "Music", "Film & Media",
  "Nursing", "Pharmacy", "Public Health", "Agriculture", "Sociology"
];

type UniversityFormData = {
  name: string;
  nameId: string;
  country: string;
  city: string;
  description: string;
  descriptionId: string;
  logoUrl: string;
  website: string;
  tuitionMinUsd: string;
  tuitionMaxUsd: string;
  ieltsMin: string;
  gpaMin: string;
  scholarshipAvailable: boolean;
  ranking: string;
};

type ProgramFormData = {
  programName: string;
  programNameId: string;
  degreeLevel: typeof DEGREE_LEVELS[number];
  fieldOfStudy: string;
  fieldOfStudyId: string;
  riasecCodes: string[];
  miTypes: string[];
  description: string;
  descriptionId: string;
};

const emptyUniForm: UniversityFormData = {
  name: "", nameId: "", country: "", city: "",
  description: "", descriptionId: "", logoUrl: "", website: "",
  tuitionMinUsd: "", tuitionMaxUsd: "", ieltsMin: "", gpaMin: "",
  scholarshipAvailable: false, ranking: ""
};

const emptyProgramForm: ProgramFormData = {
  programName: "", programNameId: "", degreeLevel: "bachelor",
  fieldOfStudy: "", fieldOfStudyId: "", riasecCodes: [],
  miTypes: [], description: "", descriptionId: ""
};

export default function UniversityManager() {
  const utils = trpc.useUtils();

  // State
  const [showUniForm, setShowUniForm] = useState(false);
  const [editingUniId, setEditingUniId] = useState<number | null>(null);
  const [uniForm, setUniForm] = useState<UniversityFormData>(emptyUniForm);
  const [expandedUniId, setExpandedUniId] = useState<number | null>(null);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [programForm, setProgramForm] = useState<ProgramFormData>(emptyProgramForm);
  const [programUniId, setProgramUniId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  // Queries
  const { data: universities, isLoading } = trpc.universityMatch.getAllUniversities.useQuery();
  const { data: programs } = trpc.universityMatch.getProgramsByUniversity.useQuery(
    { universityId: expandedUniId! },
    { enabled: !!expandedUniId }
  );

  // Mutations
  const createUni = trpc.universityMatch.createUniversity.useMutation({
    onSuccess: () => {
      utils.universityMatch.getAllUniversities.invalidate();
      setShowUniForm(false);
      setUniForm(emptyUniForm);
    }
  });

  const updateUni = trpc.universityMatch.updateUniversity.useMutation({
    onSuccess: () => {
      utils.universityMatch.getAllUniversities.invalidate();
      setShowUniForm(false);
      setEditingUniId(null);
      setUniForm(emptyUniForm);
    }
  });

  const deleteUni = trpc.universityMatch.deleteUniversity.useMutation({
    onSuccess: () => {
      utils.universityMatch.getAllUniversities.invalidate();
      if (expandedUniId) {
        utils.universityMatch.getProgramsByUniversity.invalidate({ universityId: expandedUniId });
      }
    }
  });

  const createProg = trpc.universityMatch.createProgram.useMutation({
    onSuccess: () => {
      if (programUniId) {
        utils.universityMatch.getProgramsByUniversity.invalidate({ universityId: programUniId });
      }
      setShowProgramForm(false);
      setProgramForm(emptyProgramForm);
    }
  });

  const updateProg = trpc.universityMatch.updateProgram.useMutation({
    onSuccess: () => {
      if (programUniId) {
        utils.universityMatch.getProgramsByUniversity.invalidate({ universityId: programUniId });
      }
      setShowProgramForm(false);
      setEditingProgramId(null);
      setProgramForm(emptyProgramForm);
    }
  });

  const deleteProg = trpc.universityMatch.deleteProgram.useMutation({
    onSuccess: () => {
      if (programUniId) {
        utils.universityMatch.getProgramsByUniversity.invalidate({ universityId: programUniId });
      }
    }
  });

  // Handlers
  const handleSaveUniversity = () => {
    const payload = {
      name: uniForm.name,
      nameId: uniForm.nameId || undefined,
      country: uniForm.country,
      city: uniForm.city,
      description: uniForm.description || undefined,
      descriptionId: uniForm.descriptionId || undefined,
      logoUrl: uniForm.logoUrl || undefined,
      website: uniForm.website || undefined,
      tuitionMinUsd: uniForm.tuitionMinUsd ? parseInt(uniForm.tuitionMinUsd) : undefined,
      tuitionMaxUsd: uniForm.tuitionMaxUsd ? parseInt(uniForm.tuitionMaxUsd) : undefined,
      ieltsMin: uniForm.ieltsMin || undefined,
      gpaMin: uniForm.gpaMin || undefined,
      scholarshipAvailable: uniForm.scholarshipAvailable,
      ranking: uniForm.ranking || undefined,
    };

    if (editingUniId) {
      updateUni.mutate({ id: editingUniId, ...payload });
    } else {
      createUni.mutate(payload);
    }
  };

  const handleEditUniversity = (uni: any) => {
    setEditingUniId(uni.id);
    setUniForm({
      name: uni.name || "",
      nameId: uni.nameId || "",
      country: uni.country || "",
      city: uni.city || "",
      description: uni.description || "",
      descriptionId: uni.descriptionId || "",
      logoUrl: uni.logoUrl || "",
      website: uni.website || "",
      tuitionMinUsd: uni.tuitionMinUsd?.toString() || "",
      tuitionMaxUsd: uni.tuitionMaxUsd?.toString() || "",
      ieltsMin: uni.ieltsMin || "",
      gpaMin: uni.gpaMin || "",
      scholarshipAvailable: uni.scholarshipAvailable || false,
      ranking: uni.ranking || "",
    });
    setShowUniForm(true);
  };

  const handleSaveProgram = () => {
    if (!programUniId) return;
    const payload = {
      universityId: programUniId,
      programName: programForm.programName,
      programNameId: programForm.programNameId || undefined,
      degreeLevel: programForm.degreeLevel,
      fieldOfStudy: programForm.fieldOfStudy,
      fieldOfStudyId: programForm.fieldOfStudyId || undefined,
      riasecCodes: programForm.riasecCodes.join(""),
      miTypes: programForm.miTypes.join(","),
      description: programForm.description || undefined,
      descriptionId: programForm.descriptionId || undefined,
    };

    if (editingProgramId) {
      updateProg.mutate({ id: editingProgramId, ...payload });
    } else {
      createProg.mutate(payload);
    }
  };

  const handleEditProgram = (prog: any) => {
    setEditingProgramId(prog.id);
    setProgramForm({
      programName: prog.programName || "",
      programNameId: prog.programNameId || "",
      degreeLevel: prog.degreeLevel || "bachelor",
      fieldOfStudy: prog.fieldOfStudy || "",
      fieldOfStudyId: prog.fieldOfStudyId || "",
      riasecCodes: (prog.riasecCodes || "").split("").filter((c: string) => "RIASEC".includes(c)),
      miTypes: (prog.miTypes || "").split(",").filter(Boolean),
      description: prog.description || "",
      descriptionId: prog.descriptionId || "",
    });
    setShowProgramForm(true);
  };

  // Filtered universities
  const filteredUniversities = (universities || []).filter(uni => {
    const matchesSearch = !searchQuery || 
      uni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      uni.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = !countryFilter || uni.country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  const toggleRiasec = (code: string) => {
    setProgramForm(prev => ({
      ...prev,
      riasecCodes: prev.riasecCodes.includes(code)
        ? prev.riasecCodes.filter(c => c !== code)
        : prev.riasecCodes.length < 3
          ? [...prev.riasecCodes, code]
          : prev.riasecCodes
    }));
  };

  const toggleMi = (mi: string) => {
    setProgramForm(prev => ({
      ...prev,
      miTypes: prev.miTypes.includes(mi)
        ? prev.miTypes.filter(m => m !== mi)
        : prev.miTypes.length < 3
          ? [...prev.miTypes, mi]
          : prev.miTypes
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading universities...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            University Matching Engine
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage universities and programs for aptitude test matching. {universities?.length || 0} universities total.
          </p>
        </div>
        <Button onClick={() => { setEditingUniId(null); setUniForm(emptyUniForm); setShowUniForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add University
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search universities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background"
          />
        </div>
        <select
          value={countryFilter}
          onChange={e => setCountryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
        >
          <option value="">All Countries</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* University List */}
      <div className="space-y-3">
        {filteredUniversities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No universities found</p>
            <p className="text-sm mt-1">Add universities to start building the matching engine.</p>
          </div>
        ) : (
          filteredUniversities.map(uni => (
            <div key={uni.id} className="border border-border rounded-lg overflow-hidden">
              {/* University Row */}
              <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{uni.name}</span>
                    {!uni.isActive && <Badge variant="outline" className="text-xs text-red-500 border-red-300">Inactive</Badge>}
                    {uni.scholarshipAvailable && <Badge variant="outline" className="text-xs text-green-600 border-green-300">Scholarship</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{uni.country}</span>
                    <span>{uni.city}</span>
                    {uni.tuitionMinUsd && uni.tuitionMaxUsd && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ${uni.tuitionMinUsd.toLocaleString()} - ${uni.tuitionMaxUsd.toLocaleString()}/yr
                      </span>
                    )}
                    {uni.ieltsMin && <span>IELTS {uni.ieltsMin}+</span>}
                    {uni.ranking && <Badge variant="secondary" className="text-xs">{uni.ranking}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedUniId(expandedUniId === uni.id ? null : uni.id)}
                  >
                    <GraduationCap className="w-4 h-4 mr-1" />
                    Programs
                    {expandedUniId === uni.id ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEditUniversity(uni)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => {
                      if (confirm(`Delete ${uni.name} and all its programs?`)) {
                        deleteUni.mutate({ id: uni.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Programs Panel */}
              {expandedUniId === uni.id && (
                <div className="border-t border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Programs at {uni.name}</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setProgramUniId(uni.id);
                        setEditingProgramId(null);
                        setProgramForm(emptyProgramForm);
                        setShowProgramForm(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Program
                    </Button>
                  </div>

                  {!programs || programs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No programs yet. Add programs to enable matching.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {programs.map(prog => (
                        <div key={prog.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{prog.programName}</span>
                              <Badge variant="secondary" className="text-xs capitalize">{prog.degreeLevel}</Badge>
                              {!prog.isActive && <Badge variant="outline" className="text-xs text-red-500">Inactive</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{prog.fieldOfStudy}</span>
                              <span className="text-primary font-mono">RIASEC: {prog.riasecCodes}</span>
                              <span className="text-blue-600 font-mono">MI: {prog.miTypes}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setProgramUniId(uni.id);
                              handleEditProgram(prog);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => {
                              setProgramUniId(uni.id);
                              if (confirm(`Delete program "${prog.programName}"?`)) {
                                deleteProg.mutate({ id: prog.id });
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* University Form Dialog */}
      <Dialog open={showUniForm} onOpenChange={setShowUniForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUniId ? "Edit University" : "Add University"}</DialogTitle>
            <DialogDescription>
              {editingUniId ? "Update university details." : "Add a new university to the matching engine."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name (English) *</label>
                <input
                  type="text"
                  value={uniForm.name}
                  onChange={e => setUniForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="e.g. Taylor's University"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Name (Indonesian)</label>
                <input
                  type="text"
                  value={uniForm.nameId}
                  onChange={e => setUniForm(prev => ({ ...prev, nameId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Country *</label>
                <select
                  value={uniForm.country}
                  onChange={e => setUniForm(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">City *</label>
                <input
                  type="text"
                  value={uniForm.city}
                  onChange={e => setUniForm(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="e.g. Kuala Lumpur"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tuition Min (USD/year)</label>
                <input
                  type="number"
                  value={uniForm.tuitionMinUsd}
                  onChange={e => setUniForm(prev => ({ ...prev, tuitionMinUsd: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="e.g. 3000"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tuition Max (USD/year)</label>
                <input
                  type="number"
                  value={uniForm.tuitionMaxUsd}
                  onChange={e => setUniForm(prev => ({ ...prev, tuitionMaxUsd: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="e.g. 10000"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Min IELTS</label>
                <input
                  type="text"
                  value={uniForm.ieltsMin}
                  onChange={e => setUniForm(prev => ({ ...prev, ieltsMin: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="e.g. 5.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Min GPA</label>
                <input
                  type="text"
                  value={uniForm.gpaMin}
                  onChange={e => setUniForm(prev => ({ ...prev, gpaMin: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="e.g. 2.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Ranking</label>
                <input
                  type="text"
                  value={uniForm.ranking}
                  onChange={e => setUniForm(prev => ({ ...prev, ranking: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="e.g. QS 200-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Website</label>
                <input
                  type="text"
                  value={uniForm.website}
                  onChange={e => setUniForm(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Logo URL</label>
                <input
                  type="text"
                  value={uniForm.logoUrl}
                  onChange={e => setUniForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="scholarship"
                checked={uniForm.scholarshipAvailable}
                onChange={e => setUniForm(prev => ({ ...prev, scholarshipAvailable: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="scholarship" className="text-sm font-medium">Scholarship Available</label>
            </div>

            <div>
              <label className="text-sm font-medium">Description (English)</label>
              <textarea
                value={uniForm.description}
                onChange={e => setUniForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background resize-y"
                rows={3}
                placeholder="Brief description of the university..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description (Indonesian)</label>
              <textarea
                value={uniForm.descriptionId}
                onChange={e => setUniForm(prev => ({ ...prev, descriptionId: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background resize-y"
                rows={3}
                placeholder="Deskripsi universitas..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowUniForm(false)}>Cancel</Button>
              <Button
                onClick={handleSaveUniversity}
                disabled={!uniForm.name || !uniForm.country || !uniForm.city || createUni.isPending || updateUni.isPending}
              >
                {(createUni.isPending || updateUni.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingUniId ? "Update" : "Create"} University
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Program Form Dialog */}
      <Dialog open={showProgramForm} onOpenChange={setShowProgramForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProgramId ? "Edit Program" : "Add Program"}</DialogTitle>
            <DialogDescription>
              {editingProgramId ? "Update program details and matching tags." : "Add a new program with RIASEC and MI matching tags."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Program Name (English) *</label>
                <input
                  type="text"
                  value={programForm.programName}
                  onChange={e => setProgramForm(prev => ({ ...prev, programName: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="e.g. Bachelor of Computer Science"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Program Name (Indonesian)</label>
                <input
                  type="text"
                  value={programForm.programNameId}
                  onChange={e => setProgramForm(prev => ({ ...prev, programNameId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Degree Level *</label>
                <select
                  value={programForm.degreeLevel}
                  onChange={e => setProgramForm(prev => ({ ...prev, degreeLevel: e.target.value as typeof DEGREE_LEVELS[number] }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  {DEGREE_LEVELS.map(d => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Field of Study *</label>
                <select
                  value={programForm.fieldOfStudy}
                  onChange={e => setProgramForm(prev => ({ ...prev, fieldOfStudy: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="">Select field</option>
                  {FIELD_OF_STUDY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Field of Study (Indonesian)</label>
              <input
                type="text"
                value={programForm.fieldOfStudyId}
                onChange={e => setProgramForm(prev => ({ ...prev, fieldOfStudyId: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                placeholder="e.g. Teknik Informatika"
              />
            </div>

            {/* RIASEC Code Selector */}
            <div>
              <label className="text-sm font-medium">RIASEC Codes * (select 2-3)</label>
              <p className="text-xs text-muted-foreground mb-2">Select the RIASEC dimensions that best match this program.</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(RIASEC_LABELS).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleRiasec(code)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      programForm.riasecCodes.includes(code)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    <span className="font-bold mr-1">{code}</span> {label}
                  </button>
                ))}
              </div>
              {programForm.riasecCodes.length > 0 && (
                <p className="text-xs text-primary mt-1">Selected: {programForm.riasecCodes.join("")}</p>
              )}
            </div>

            {/* MI Type Selector */}
            <div>
              <label className="text-sm font-medium">Multiple Intelligence Types * (select 2-3)</label>
              <p className="text-xs text-muted-foreground mb-2">Select the intelligence types most relevant to this program.</p>
              <div className="flex flex-wrap gap-2">
                {MI_OPTIONS.map(mi => (
                  <button
                    key={mi}
                    type="button"
                    onClick={() => toggleMi(mi)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors capitalize ${
                      programForm.miTypes.includes(mi)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    {mi}
                  </button>
                ))}
              </div>
              {programForm.miTypes.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">Selected: {programForm.miTypes.join(", ")}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Description (English)</label>
              <textarea
                value={programForm.description}
                onChange={e => setProgramForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background resize-y"
                rows={2}
                placeholder="Brief program description..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowProgramForm(false)}>Cancel</Button>
              <Button
                onClick={handleSaveProgram}
                disabled={
                  !programForm.programName || !programForm.fieldOfStudy ||
                  programForm.riasecCodes.length === 0 || programForm.miTypes.length === 0 ||
                  createProg.isPending || updateProg.isPending
                }
              >
                {(createProg.isPending || updateProg.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingProgramId ? "Update" : "Create"} Program
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
