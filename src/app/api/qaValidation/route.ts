import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/backend/config/supabaseConfig';
import { getAuth } from '@clerk/nextjs/server';

// Define QA rules interface
interface QARule {
  id: string;
  name: string;
  description: string;
  rule_type: string;
  rule_pattern: string;
  severity: 'error' | 'warning' | 'info';
  is_active: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication using getAuth instead of auth
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { html, ruleIds } = await request.json();
    
    if (!html) {
      return NextResponse.json(
        { error: 'No HTML content provided' },
        { status: 400 }
      );
    }
    
    // Fetch QA rules from Supabase
    let query = supabase.from('qa_rules').select('*').eq('is_active', true);
    
    // If specific rule IDs are provided, filter by them
    if (ruleIds && ruleIds.length > 0) {
      query = query.in('id', ruleIds);
    }
    
    const { data: rules, error: rulesError } = await query;
    
    if (rulesError) {
      console.error('Rules fetch error:', rulesError);
      return NextResponse.json(
        { error: 'Failed to fetch QA rules' },
        { status: 500 }
      );
    }
    
    // Validate HTML against each rule
    const validationResults = rules.map((rule: QARule) => {
      let isPassing = true;
      let message = '';
      
      try {
        // Different validation logic based on rule type
        switch (rule.rule_type) {
          case 'regex':
            const regex = new RegExp(rule.rule_pattern, 'i');
            isPassing = regex.test(html);
            message = isPassing ? 'Rule passed' : `Failed to match pattern: ${rule.rule_pattern}`;
            break;
            
          case 'attribute':
            // Check for required attributes
            const attributeRegex = new RegExp(`<[^>]*${rule.rule_pattern}[^>]*>`, 'i');
            isPassing = attributeRegex.test(html);
            message = isPassing ? 'Rule passed' : `Missing required attribute: ${rule.rule_pattern}`;
            break;
            
          case 'tag':
            // Check for required tags
            const tagRegex = new RegExp(`<${rule.rule_pattern}[^>]*>`, 'i');
            isPassing = tagRegex.test(html);
            message = isPassing ? 'Rule passed' : `Missing required tag: ${rule.rule_pattern}`;
            break;
            
          default:
            message = 'Unknown rule type';
            isPassing = false;
        }
      } catch (error) {
        console.error(`Rule validation error for rule ${rule.id}:`, error);
        isPassing = false;
        message = 'Error validating rule';
      }
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        description: rule.description,
        severity: rule.severity,
        isPassing,
        message
      };
    });
    
    // Calculate overall pass/fail
    const hasErrors = validationResults.some(
      result => !result.isPassing && result.severity === 'error'
    );
    
    // Store validation result in Supabase
    const { error: resultError } = await supabase
      .from('qa_validation_results')
      .insert([
        {
          user_id: userId,
          html_content: html,
          results: validationResults,
          passed: !hasErrors,
          created_at: new Date().toISOString()
        }
      ]);
      
    if (resultError) {
      console.error('Result storage error:', resultError);
      // Continue anyway, as this is just for logging
    }
    
    return NextResponse.json({
      success: true,
      passed: !hasErrors,
      results: validationResults
    });
    
  } catch (error) {
    console.error('QA validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate HTML' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve QA rules
export async function GET(request: NextRequest) {
  try {
    // Check authentication using getAuth instead of auth
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    let query = supabase.from('qa_rules').select('*');
    
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    
    const { data: rules, error } = await query;
    
    if (error) {
      console.error('Rules fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch QA rules' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ rules });
    
  } catch (error) {
    console.error('QA rules fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QA rules' },
      { status: 500 }
    );
  }
} 