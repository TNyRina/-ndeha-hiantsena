/**
 * src/components/purchase/FormComponents.tsx
 *
 * Composants réutilisables pour les formulaires de l'écran Purchase.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, FlatList, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Pressable,
} from 'react-native';
import { X, ChevronDown, Check, Plus } from 'lucide-react-native';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SelectOption {
  label: string;
  value: number;
}

interface Theme {
  colors: {
    background: string; 
    surface: string;
    card: string; 
    cardBorder: string;
    text: { 
        primary: string; 
        secondary: string; 
        muted: string 
    };
    accent: { 
        primary: string; 
        light: string 
    };
    border: string; 
    input: string; 
    inputBorder: string; 
    danger: string;
  };
}

// ─── ModalShell ────────────────────────────────────────────────────────────────

interface ModalShellProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
  theme: Theme;
  children: React.ReactNode;
}

export function ModalShell({
  visible, title, onClose, onSubmit,
  loading, submitLabel = 'Enregistrer', theme, children,
}: ModalShellProps) {
  const c = theme.colors;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kvContainer}
        >
          <Pressable
            style={[s.sheet, { backgroundColor: c.card }]}
            onPress={e => e.stopPropagation()}
          >
            {/* Header */}
            <View style={[s.sheetHeader, { borderBottomColor: c.border }]}>
              <Text style={[s.sheetTitle, { color: c.text.primary }]}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <X size={20} color={c.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView
              style={s.sheetBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
              <View style={{ height: 16 }} />
            </ScrollView>

            {/* Footer */}
            <View style={[s.sheetFooter, { borderTopColor: c.border }]}>
              <TouchableOpacity
                style={[s.btnSecondary, { borderColor: c.border }]}
                onPress={onClose}
              >
                <Text style={[s.btnSecondaryText, { color: c.text.secondary }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnPrimary, { backgroundColor: c.accent.primary }]}
                onPress={onSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.btnPrimaryText}>{submitLabel}</Text>
                }
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── FormInput ─────────────────────────────────────────────────────────────────

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  theme: Theme;
  required?: boolean;
}

export function FormInput({
  label, value, onChangeText, placeholder,
  keyboardType = 'default', theme, required,
}: FormInputProps) {
  const c = theme.colors;
  return (
    <View style={s.fieldGroup}>
      <Text style={[s.fieldLabel, { color: c.text.secondary }]}>
        {label}{required && <Text style={{ color: c.danger }}> *</Text>}
      </Text>
      <TextInput
        style={[s.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.text.primary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.text.muted}
        keyboardType={keyboardType}
      />
    </View>
  );
}

// ─── SelectPicker ──────────────────────────────────────────────────────────────

interface SelectPickerProps {
  label: string;
  options: SelectOption[];
  value: number | null;
  onSelect: (value: number) => void;
  placeholder?: string;
  theme: Theme;
  required?: boolean;
  onCreateNew?: () => void;
  createNewLabel?: string;
}

export function SelectPicker({
  label, options, value, onSelect,
  placeholder = 'Sélectionner...', theme, required,
  onCreateNew, createNewLabel = 'Créer nouveau',
}: SelectPickerProps) {
  const [open, setOpen] = useState(false);
  const c = theme.colors;
  const selected = options.find(o => o.value === value);

  return (
    <View style={s.fieldGroup}>
      <Text style={[s.fieldLabel, { color: c.text.secondary }]}>
        {label}{required && <Text style={{ color: c.danger }}> *</Text>}
      </Text>

      <TouchableOpacity
        style={[s.select, { backgroundColor: c.input, borderColor: c.inputBorder }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[s.selectText, { color: selected ? c.text.primary : c.text.muted }]}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color={c.text.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <View style={[s.pickerSheet, { backgroundColor: c.card }]}>
            <Text style={[s.sheetTitle, { color: c.text.primary, marginBottom: 12 }]}>
              {label}
            </Text>

            {onCreateNew && (
              <TouchableOpacity
                style={[s.createNewRow, { borderColor: c.accent.primary }]}
                onPress={() => { setOpen(false); onCreateNew(); }}
              >
                <Plus size={14} color={c.accent.primary} />
                <Text style={[s.createNewText, { color: c.accent.primary }]}>
                  {createNewLabel}
                </Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={options}
              keyExtractor={o => String(o.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    s.pickerItem,
                    item.value === value && { backgroundColor: c.accent.light },
                  ]}
                  onPress={() => { onSelect(item.value); setOpen(false); }}
                >
                  <Text style={[s.pickerItemText, { color: c.text.primary }]}>
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Check size={14} color={c.accent.primary} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 280 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── SectionHeader ─────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  theme: Theme;
}

export function SectionHeader({ title, onAdd, addLabel, theme }: SectionHeaderProps) {
  const c = theme.colors;
  return (
    <View style={s.sectionHeader}>
      <Text style={[s.sectionTitle, { color: c.text.primary }]}>{title}</Text>
      {onAdd && (
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: c.accent.light }]}
          onPress={onAdd}
        >
          <Plus size={14} color={c.accent.primary} strokeWidth={2.5} />
          <Text style={[s.addBtnText, { color: c.accent.primary }]}>
            {addLabel ?? 'Ajouter'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  kvContainer: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16 },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  btnSecondary: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 15, fontWeight: '600' },
  btnPrimary: {
    flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15,
  },
  select: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { fontSize: 15, flex: 1 },
  pickerSheet: {
    margin: 20, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 12,
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10,
  },
  pickerItemText: { fontSize: 15 },
  createNewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1.5, borderRadius: 10, marginBottom: 8, borderStyle: 'dashed',
  },
  createNewText: { fontSize: 13, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  addBtnText: { fontSize: 13, fontWeight: '600' },
});
